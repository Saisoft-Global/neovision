from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from pathlib import Path
import os
import logging
import tempfile
import uuid
from typing import Dict, Any, Optional
import hashlib
from collections import OrderedDict
from fastapi import Form
import time
from sqlalchemy.orm import Session

from config.database import get_db
from routers.documents import save_document_to_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Global document processor instance (will be injected from main.py)
document_processor = None

def get_document_processor():
    """Dependency to get the document processor instance"""
    global document_processor
    if document_processor is None:
        from models.document_processor import DocumentProcessor
        document_processor = DocumentProcessor()
    return document_processor

def get_simple_processor():
    """Get a simple processor for bbox extraction only"""
    try:
        from models.simple_processor import SimpleDocumentProcessor
        return SimpleDocumentProcessor()
    except Exception as e:
        logger.error(f"Failed to initialize SimpleDocumentProcessor: {e}")
        # Return a minimal processor that just returns empty results
        class MinimalProcessor:
            def process_document(self, file_path: str):
                return {
                    "extracted_text": "",
                    "document_type": "unknown",
                    "confidence": 0.0,
                    "bounding_boxes": []
                }
        return MinimalProcessor()


def _title_case(label: str) -> str:
    try:
        return label.replace('_', ' ').strip().title()
    except Exception:
        return label


def _normalize_text(text: str) -> str:
    try:
        import re
        t = text.lower()
        t = re.sub(r"[^a-z0-9]+", "", t)
        return t
    except Exception:
        return text


def _quad_to_bbox(box: Any) -> Any:
    try:
        # box is [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        x = min(xs)
        y = min(ys)
        w = max(xs) - x
        h = max(ys) - y
        return [x, y, w, h]
    except Exception:
        return None


def _index_bounding_boxes(bounding_boxes: Any) -> list:
    indexed = []
    if isinstance(bounding_boxes, list):
        for bb in bounding_boxes:
            if not isinstance(bb, dict):
                continue
            text = str(bb.get("text", ""))
            norm = _normalize_text(text)
            bbox = _quad_to_bbox(bb.get("box"))
            conf = bb.get("confidence", 0.0)
            indexed.append({"text": text, "norm": norm, "bbox": bbox, "confidence": conf})
    return indexed


def _find_bbox_for_value(indexed_boxes: list, value: Any) -> Any:
    if value is None:
        return None
    val = str(value)
    norm_val = _normalize_text(val)
    best = None
    best_score = -1.0
    for bb in indexed_boxes:
        if not bb["norm"] or not norm_val:
            continue
        # simple containment match in either direction
        contains = bb["norm"] in norm_val or norm_val in bb["norm"]
        if contains:
            score = bb.get("confidence", 0.0) * (len(bb["norm"]) / max(len(norm_val), 1))
            if score > best_score:
                best_score = score
                best = bb
    return best.get("bbox") if best else None


def _build_fields_from_extracted(extracted: Dict[str, Any], bounding_boxes: Any = None) -> list:
    fields: list = []
    indexed_boxes = _index_bounding_boxes(bounding_boxes)
    try:
        for key, value in extracted.items():
            bbox = _find_bbox_for_value(indexed_boxes, value) if indexed_boxes else None
            fields.append({
                "id": str(key),
                "label": _title_case(str(key)),
                "value": "" if value is None else str(value),
                "confidence": 0.0,
                **({"bbox": bbox} if bbox else {})
            })
    except Exception as e:
        logger.error(f"Failed to map extracted_fields to fields: {e}")
    return fields


def _build_line_items_from_tables(tables: Any) -> list:
    line_item_fields: list = []
    try:
        if not isinstance(tables, list):
            return line_item_fields
        line_index = 1
        for table in tables:
            rows = table.get("data") if isinstance(table, dict) else None
            if not isinstance(rows, list):
                continue
            for row in rows:
                if not isinstance(row, list) or len(row) < 4:
                    continue
                description = "" if row[0] is None else str(row[0])
                quantity = "" if row[1] is None else str(row[1])
                unit_price = "" if row[2] is None else str(row[2])
                total = "" if row[-1] is None else str(row[-1])

                has_any = any([description, quantity, unit_price, total])
                looks_like_header = False
                try:
                    joined = " ".join(str(x) for x in row)
                    looks_like_header = bool(__import__("re").search(r"description|qty|quantity|rate|price|amount|tax", joined, __import__("re").I))
                except Exception:
                    pass

                if has_any and not looks_like_header:
                    line_item_fields.extend([
                        {"id": f"line_item_{line_index}_description", "label": "Description", "value": description, "confidence": 0.0},
                        {"id": f"line_item_{line_index}_quantity", "label": "Quantity", "value": quantity, "confidence": 0.0},
                        {"id": f"line_item_{line_index}_price", "label": "Unit Price", "value": unit_price, "confidence": 0.0},
                        {"id": f"line_item_{line_index}_total", "label": "Total", "value": total, "confidence": 0.0},
                    ])
                    line_index += 1
    except Exception as e:
        logger.error(f"Failed to derive line items from tables: {e}")
    return line_item_fields


def _extract_line_items_structured(tables: Any) -> list:
    """Return a list of structured line items [{description, quantity, price, total}] using header-based detection."""
    structured: list = []
    try:
        if not isinstance(tables, list):
            return structured

        import re
        header_keywords = [
            r"description",
            r"qty|quantity",
            r"rate|price|unit\s*price",
            r"amount|total",
        ]

        def is_header_row(row: list) -> bool:
            text = " ".join(str(x).lower() for x in row)
            hits = 0
            for pat in header_keywords:
                if re.search(pat, text):
                    hits += 1
            return hits >= 2

        # Find header table index
        header_index = None
        for idx, table in enumerate(tables):
            rows = table.get("data") if isinstance(table, dict) else None
            if not isinstance(rows, list) or not rows:
                continue
            if is_header_row(rows[0]):
                header_index = idx
                break

        # If header found, look at subsequent tables/rows for data
        candidate_tables = []
        if header_index is not None:
            candidate_tables = tables[header_index + 1: header_index + 6]
        else:
            candidate_tables = tables

        for table in candidate_tables:
            rows = table.get("data") if isinstance(table, dict) else None
            if not isinstance(rows, list):
                continue
            for row in rows:
                if not isinstance(row, list) or len(row) < 3:
                    continue
                text_join = " ".join(str(x).lower() for x in row)
                if is_header_row(row):
                    continue
                # Basic mapping: [description, qty, price, ..., total(last)]
                description = str(row[0]) if row[0] is not None else ""
                quantity = str(row[1]) if len(row) > 1 and row[1] is not None else ""
                price = str(row[2]) if len(row) > 2 and row[2] is not None else ""
                total = str(row[-1]) if row[-1] is not None else ""
                has_any = any([description, quantity, price, total])
                # Skip rows that are clearly summaries/subtotals
                if re.search(r"sub\s*total|tax|balance|total", text_join) and not re.search(r"item|description", text_join):
                    continue
                if has_any:
                    structured.append({
                        "description": description,
                        "quantity": quantity,
                        "price": price,
                        "total": total,
                    })
        return structured
    except Exception as e:
        logger.error(f"Failed to build structured line items: {e}")
        return structured


def _format_response_for_frontend(raw: Dict[str, Any]) -> Dict[str, Any]:
    # Preserve original keys, add UI-friendly fields
    formatted = dict(raw)

    # documentType alias
    if "documentType" not in formatted and "document_type" in formatted:
        formatted["documentType"] = formatted.get("document_type")

    # Build fields[] if not present
    existing_fields = formatted.get("fields")
    if not isinstance(existing_fields, list):
        fields_accum: list = []
        if isinstance(formatted.get("extracted_fields"), dict):
            fields_accum.extend(_build_fields_from_extracted(
                formatted["extracted_fields"],
                formatted.get("bounding_boxes")
            ))
        # Add line items derived from tables (model-led table detection output)
        fields_accum.extend(_build_line_items_from_tables(formatted.get("tables")))

        # De-duplicate by id, preserve first
        dedup: dict = {}
        for f in fields_accum:
            fid = f.get("id")
            if fid and fid not in dedup:
                dedup[fid] = f
        formatted["fields"] = list(dedup.values())

    # Also include a structured lineItems array for Nanonets-style consumers
    if "lineItems" not in formatted:
        structured_items = _extract_line_items_structured(formatted.get("tables"))
        if structured_items:
            formatted["lineItems"] = structured_items

    return formatted

# ---------------------------------------------------------------------------
# Lightweight LRU cache for bbox extraction to avoid reprocessing same file
# ---------------------------------------------------------------------------

_BBOX_CACHE_MAX_SIZE = 32
_bbox_cache: "OrderedDict[str, Dict[str, Any]]" = OrderedDict()

def _cache_get(hash_key: str) -> Dict[str, Any] | None:
    try:
        global _bbox_cache
        if hash_key in _bbox_cache:
            value = _bbox_cache.pop(hash_key)
            _bbox_cache[hash_key] = value  # mark as most-recently used
            return value
        return None
    except Exception:
        return None

def _cache_set(hash_key: str, value: Dict[str, Any]) -> None:
    try:
        global _bbox_cache
        if hash_key in _bbox_cache:
            _bbox_cache.pop(hash_key)
        _bbox_cache[hash_key] = value
        while len(_bbox_cache) > _BBOX_CACHE_MAX_SIZE:
            _bbox_cache.popitem(last=False)  # evict least-recently used
    except Exception:
        pass

@router.post("/process-document")
async def process_document(
    file: UploadFile = File(...),
    processor = Depends(get_document_processor),
    db: Session = Depends(get_db),
    save_to_db: bool = True
) -> Dict[str, Any]:
    """Process a document using ML models with optional database persistence"""
    temp_path = None
    start_time = time.time()
    try:
        logger.info(f"Processing document: {file.filename}")
        
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Get file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        supported_types = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.txt', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.rtf']
        
        if file_ext not in supported_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file_ext}. Supported: {supported_types}"
            )
        
        # Create unique temp file
        temp_dir = Path("temp")
        temp_dir.mkdir(exist_ok=True)
        unique_id = str(uuid.uuid4())[:8]
        temp_path = temp_dir / f"inference_{unique_id}_{file.filename}"
        
        # Save uploaded file
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)
        
        # Process document using the global processor instance
        result = processor.process_document(str(temp_path))
        
        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)

        # Add processing metadata
        result["processing_method"] = "inference_router"
        result["file_size"] = len(content)
        result["processing_time_ms"] = processing_time_ms

        # Normalize response for frontend consumption (model-first)
        formatted = _format_response_for_frontend(result)
        
        # Save to database if requested (and if we have user context)
        if save_to_db:
            try:
                # Get current user from request context (if available)
                # For now, we'll use a default user_id - in production, this should come from auth
                from models.active_model_manager import ActiveModelManager
                active_model_manager = ActiveModelManager()
                active_model_info = active_model_manager.get_active_model()
                model_name = active_model_info.get("model_name", "unknown")
                
                # Get default admin user for document processing
                from config.database import get_default_admin_user
                admin_user = get_default_admin_user()
                if admin_user:
                    user_id = admin_user["user_id"]
                    organization_id = admin_user["organization_id"]
                else:
                    # Fallback if admin user not found
                    user_id = "00000000-0000-0000-0000-000000000000"
                    organization_id = "00000000-0000-0000-0000-000000000000"
                
                # Save document and extraction to database
                saved_document = save_document_to_db(
                    db=db,
                    user_id=user_id,
                    organization_id=organization_id,
                    filename=file.filename,
                    content=content,
                    mime_type=file.content_type or "application/octet-stream",
                    processing_result=formatted,
                    model_name=model_name
                )
                
                # Add document ID to response
                formatted["document_id"] = str(saved_document.id)
                logger.info(f"Document saved to database: {saved_document.id}")
                
                # Add document to AI solution's knowledge base
                await add_document_to_ai_kb(
                    document_id=str(saved_document.id),
                    user_id=user_id,
                    filename=file.filename,
                    content=content,
                    extracted_fields=formatted.get("fields", []),
                    processing_result=formatted
                )
                
            except Exception as db_error:
                logger.warning(f"Failed to save to database: {str(db_error)}")
                # Don't fail the request if DB save fails
                formatted["database_save_error"] = str(db_error)
        
        return formatted
        
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error processing document: {str(e)}"
        )
    finally:
        # Cleanup temp file
        if temp_path and temp_path.exists():
            try:
                temp_path.unlink()
            except Exception as cleanup_error:
                logger.error(f"Cleanup error: {str(cleanup_error)}")

async def add_document_to_ai_kb(
    document_id: str,
    user_id: str,
    filename: str,
    content: bytes,
    extracted_fields: list,
    processing_result: dict
):
    """Add document to AI solution's knowledge base"""
    try:
        from services.ai_agent_client import AIAgentClient
        from config.ai_config import get_ai_config
        
        # Check if knowledge base integration is enabled
        config = get_ai_config()
        if not config.enable_knowledge_base:
            logger.info("Knowledge base integration is disabled")
            return
        
        # Prepare document content for AI KB
        document_content = content.decode('utf-8', errors='ignore')
        
        # Create title from filename and extracted fields
        title = filename
        if extracted_fields:
            # Try to extract meaningful title from fields
            for field in extracted_fields:
                if field.get('label', '').lower() in ['title', 'document_title', 'subject']:
                    title = field.get('value', filename)
                    break
        
        # Prepare metadata for AI KB
        metadata = {
            "document_id": document_id,
            "user_id": user_id,
            "filename": filename,
            "extracted_fields": extracted_fields,
            "processing_confidence": processing_result.get("confidence", 0.0),
            "model_used": processing_result.get("model_name", "unknown"),
            "source": "neocaptured_idp",
            "upload_timestamp": datetime.utcnow().isoformat()
        }
        
        # Determine category based on document type or content
        category = "general"
        if any(keyword in filename.lower() for keyword in ['invoice', 'bill', 'receipt']):
            category = "financial"
        elif any(keyword in filename.lower() for keyword in ['contract', 'agreement']):
            category = "legal"
        elif any(keyword in filename.lower() for keyword in ['report', 'analysis']):
            category = "reports"
        
        # Add tags based on extracted fields
        tags = [category]
        for field in extracted_fields:
            if field.get('label'):
                tags.append(field['label'].lower().replace(' ', '_'))
        
        # Add to AI solution's knowledge base
        async with AIAgentClient() as client:
            kb_result = await client.add_to_knowledge_base(
                document_id=document_id,
                title=title,
                content=document_content,
                category=category,
                tags=tags[:10]  # Limit tags to 10
            )
            
            logger.info(f"Document {document_id} added to AI knowledge base: {kb_result.get('knowledge_id')}")
            
            # Also vectorize the document for better search
            vector_result = await client.vectorize_document(
                document_id=document_id,
                content=document_content,
                metadata=metadata
            )
            
            logger.info(f"Document {document_id} vectorized: {vector_result.get('vector_id')}")
            
    except Exception as e:
        logger.error(f"Error adding document {document_id} to AI knowledge base: {e}", exc_info=True)
        # Don't fail the main document processing if KB addition fails

@router.get("/health")
async def health_check():
    """Health check for inference router"""
    return {"status": "healthy", "router": "inference"}


@router.post("/extract-by-bbox")
async def extract_by_bbox(
    file: UploadFile = File(...),
    x: float = Form(...),
    y: float = Form(...),
    width: float = Form(...),
    height: float = Form(...),
    canvas_width: float = Form(None),
    canvas_height: float = Form(None)
) -> Dict[str, Any]:
    """Extract text within a bounding box by first processing the document and
    aggregating tokens whose quads fall inside the given region.

    Coordinates are in the same pixel space as returned in bounding_boxes.
    """
    temp_path = None
    try:
        # Read all content and compute a stable hash to cache tokenization
        content = await file.read()
        file_hash = hashlib.sha1(content).hexdigest()
        temp_dir = Path("temp")
        temp_dir.mkdir(exist_ok=True)
        unique_id = str(uuid.uuid4())[:8]
        temp_path = temp_dir / f"extract_{unique_id}_{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(content)

        # Try cache first to avoid reprocessing
        cached = _cache_get(file_hash)
        if cached is not None:
            boxes = cached.get("bounding_boxes", [])
            max_x_cached = cached.get("max_x")
            max_y_cached = cached.get("max_y")
        else:
            # Use simple processor for bbox extraction only (not full ML processing)
            simple_processor = get_simple_processor()
            result = simple_processor.process_document(str(temp_path))
            boxes = result.get("bounding_boxes", [])
            try:
                # Precompute max extents for scaling
                max_x_cached = max(max(p[0] for p in bb.get("box", [])) for bb in boxes if isinstance(bb, dict) and isinstance(bb.get("box"), list))
                max_y_cached = max(max(p[1] for p in bb.get("box", [])) for bb in boxes if isinstance(bb, dict) and isinstance(bb.get("box"), list))
            except Exception:
                max_x_cached, max_y_cached = None, None
            _cache_set(file_hash, {
                "bounding_boxes": boxes,
                "max_x": max_x_cached,
                "max_y": max_y_cached,
                "filename": file.filename,
            })

        # Convert region to rectangle
        rx1, ry1 = float(x), float(y)
        rx2, ry2 = rx1 + float(width), ry1 + float(height)

        # Optional rescale from canvas space to document pixel space
        try:
            if canvas_width and canvas_height and isinstance(boxes, list) and boxes:
                max_x = max_x_cached if max_x_cached is not None else max(max(p[0] for p in bb.get("box", [])) for bb in boxes if isinstance(bb, dict) and isinstance(bb.get("box"), list))
                max_y = max_y_cached if max_y_cached is not None else max(max(p[1] for p in bb.get("box", [])) for bb in boxes if isinstance(bb, dict) and isinstance(bb.get("box"), list))
                if float(canvas_width) > 0 and float(canvas_height) > 0:
                    sx = float(max_x) / float(canvas_width)
                    sy = float(max_y) / float(canvas_height)
                    rx1, ry1, rx2, ry2 = rx1 * sx, ry1 * sy, rx2 * sx, ry2 * sy
        except Exception:
            pass

        def quad_in_region(quad: Any, pad_scale: float = 0.05) -> bool:
            try:
                xs = [p[0] for p in quad]
                ys = [p[1] for p in quad]
                qx1, qy1 = min(xs), min(ys)
                qx2, qy2 = max(xs), max(ys)
                # Slight padding to account for rounding/scaling
                pad_x = max(2.0, (rx2 - rx1) * pad_scale)
                pad_y = max(2.0, (ry2 - ry1) * pad_scale)
                _rx1, _ry1 = rx1 - pad_x, ry1 - pad_y
                _rx2, _ry2 = rx2 + pad_x, ry2 + pad_y
                # Intersection over min-area heuristic
                ix1, iy1 = max(_rx1, qx1), max(_ry1, qy1)
                ix2, iy2 = min(_rx2, qx2), min(_ry2, qy2)
                return ix2 > ix1 and iy2 > iy1
            except Exception:
                return False

        # Collect texts inside region, roughly left-to-right top-to-bottom
        def collect_text(pad_scale: float) -> str:
            local_hits = []
            for bb in boxes:
                quad = bb.get("box")
                if quad and quad_in_region(quad, pad_scale):
                    cx = sum(p[0] for p in quad) / 4.0
                    cy = sum(p[1] for p in quad) / 4.0
                    local_hits.append((cy, cx, str(bb.get("text", ""))))
            local_hits.sort()
            return " ".join(t for (_, _, t) in local_hits).strip()

        def count_hits(pad_scale: float) -> int:
            c = 0
            for bb in boxes:
                quad = bb.get("box")
                if quad and quad_in_region(quad, pad_scale):
                    c += 1
            return c

        extracted_text = collect_text(0.05)
        hits_count = count_hits(0.05)
        if not extracted_text:
            # One-time retry with larger expansion
            extracted_text = collect_text(0.10)
            hits_count = count_hits(0.10)
        
        # Debug logging
        logger.info(f"Bbox extraction: region=({rx1},{ry1},{rx2},{ry2}), hits={hits_count}, text='{extracted_text}'")

        return {"text": extracted_text}

    except Exception as e:
        logger.error(f"Error extracting by bbox: {e}", exc_info=True)
        # Return empty text instead of raising error to prevent 500
        return {"text": ""}
    finally:
        if temp_path and temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass