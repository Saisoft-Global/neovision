from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from pathlib import Path
import os
import logging
import tempfile
import uuid
from typing import Dict, Any
from fastapi import Form

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

@router.post("/process-document")
async def process_document(
    file: UploadFile = File(...),
    processor = Depends(get_document_processor)
) -> Dict[str, Any]:
    """Process a document using ML models - Fixed version with proper file handling"""
    temp_path = None
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

        # Add processing metadata
        result["processing_method"] = "inference_router"
        result["file_size"] = len(content)

        # Normalize response for frontend consumption (model-first)
        formatted = _format_response_for_frontend(result)
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
        # Save uploaded file temporarily
        content = await file.read()
        temp_dir = Path("temp")
        temp_dir.mkdir(exist_ok=True)
        unique_id = str(uuid.uuid4())[:8]
        temp_path = temp_dir / f"extract_{unique_id}_{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(content)

        # Use simple processor for bbox extraction only (not full ML processing)
        simple_processor = get_simple_processor()
        result = simple_processor.process_document(str(temp_path))
        boxes = result.get("bounding_boxes", [])

        # Convert region to rectangle
        rx1, ry1 = float(x), float(y)
        rx2, ry2 = rx1 + float(width), ry1 + float(height)

        # Optional rescale from canvas space to document pixel space
        try:
            if canvas_width and canvas_height and isinstance(boxes, list) and boxes:
                max_x = max(max(p[0] for p in bb.get("box", [])) for bb in boxes if isinstance(bb, dict) and isinstance(bb.get("box"), list))
                max_y = max(max(p[1] for p in bb.get("box", [])) for bb in boxes if isinstance(bb, dict) and isinstance(bb.get("box"), list))
                if float(canvas_width) > 0 and float(canvas_height) > 0:
                    sx = float(max_x) / float(canvas_width)
                    sy = float(max_y) / float(canvas_height)
                    rx1, ry1, rx2, ry2 = rx1 * sx, ry1 * sy, rx2 * sx, ry2 * sy
        except Exception:
            pass

        def quad_in_region(quad: Any) -> bool:
            try:
                xs = [p[0] for p in quad]
                ys = [p[1] for p in quad]
                qx1, qy1 = min(xs), min(ys)
                qx2, qy2 = max(xs), max(ys)
                # Slight padding to account for rounding/scaling
                pad_x = max(2.0, (rx2 - rx1) * 0.02)
                pad_y = max(2.0, (ry2 - ry1) * 0.02)
                _rx1, _ry1 = rx1 - pad_x, ry1 - pad_y
                _rx2, _ry2 = rx2 + pad_x, ry2 + pad_y
                # Intersection over min-area heuristic
                ix1, iy1 = max(_rx1, qx1), max(_ry1, qy1)
                ix2, iy2 = min(_rx2, qx2), min(_ry2, qy2)
                return ix2 > ix1 and iy2 > iy1
            except Exception:
                return False

        # Collect texts inside region, roughly left-to-right top-to-bottom
        hits = []
        for bb in boxes:
            quad = bb.get("box")
            if quad and quad_in_region(quad):
                cx = sum(p[0] for p in quad) / 4.0
                cy = sum(p[1] for p in quad) / 4.0
                hits.append((cy, cx, str(bb.get("text", ""))))

        hits.sort()  # sort by y then x
        extracted_text = " ".join(t for (_, _, t) in hits).strip()
        
        # Debug logging
        logger.info(f"Bbox extraction: region=({rx1},{ry1},{rx2},{ry2}), found {len(hits)} hits, text='{extracted_text}'")

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