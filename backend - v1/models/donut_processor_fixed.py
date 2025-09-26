from typing import List, Dict, Any
import re
from log import logger

class DonutDocumentProcessor:
    def _extract_page_data(self, lines: List[str]) -> Dict[str, Any]:
        """Extract page-wise data from lines of text."""
        try:
            # Look for page indicators
            page_indicators = [
                r'page\s*\d+',
                r'pg\s*\d+',
                r'p\s*\d+',
                r'page\s*\d+\s*of\s*\d+',
                r'pg\s*\d+\s*of\s*\d+',
                r'p\s*\d+\s*of\s*\d+'
            ]
            
            page_data = {}
            current_page = 1
            
            for i, line in enumerate(lines):
                line_lower = line.lower()
                for indicator in page_indicators:
                    match = re.search(indicator, line_lower)
                    if match:
                        # Extract page number
                        page_num_match = re.search(r'\d+', match.group(0))
                        if page_num_match:
                            current_page = int(page_num_match.group(0))
                            break
                
                # Group lines by page
                if current_page not in page_data:
                    page_data[current_page] = []
                
                page_data[current_page].append(line)
            
            # Convert page data to structured format
            structured_page_data = []
            for page_num, page_lines in page_data.items():
                structured_page_data.append({
                    "page_number": page_num,
                    "content": page_lines,
                    "confidence": 0.9
                })
            
            return {
                "pages": structured_page_data,
                "total_pages": len(page_data),
                "confidence": 0.9
            }
            
        except Exception as e:
            logger.error(f"Error extracting page data: {str(e)}")
            return {
                "pages": [],
                "total_pages": 0,
                "confidence": 0.0
            } 