import cv2
import numpy as np
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass

@dataclass
class TableCell:
    text: str
    bbox: List[float]
    confidence: float
    row: int
    col: int

@dataclass
class Table:
    bbox: List[float]
    cells: List[List[TableCell]]
    header_row: List[str]

class TableDetector:
    def __init__(self):
        self.min_table_area = 1000
        self.line_min_length = 50
        self.line_max_gap = 10

    def detect_tables(self, image: np.ndarray) -> List[List[int]]:
        """Detect table boundaries in the image"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        binary = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 11, 2
        )

        horizontal = self._detect_lines(binary.copy(), 'horizontal')
        vertical = self._detect_lines(binary.copy(), 'vertical')
        
        table_mask = cv2.bitwise_or(horizontal, vertical)
        contours, _ = cv2.findContours(
            table_mask, 
            cv2.RETR_EXTERNAL, 
            cv2.CHAIN_APPROX_SIMPLE
        )

        tables = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area > self.min_table_area:
                x, y, w, h = cv2.boundingRect(contour)
                tables.append([x, y, x + w, y + h])

        return tables

    def process_table(self, image: np.ndarray, table_bbox: List[int]) -> Table:
        """Process a detected table"""
        x, y, x2, y2 = table_bbox
        table_region = image[y:y2, x:x2]
        
        # Extract cells
        cells = self._extract_cells(table_region, table_bbox)
        
        # Identify headers
        headers = self._identify_headers(cells[0] if cells else [])
        
        return Table(
            bbox=table_bbox,
            cells=cells,
            header_row=headers
        )

    def _detect_lines(self, img: np.ndarray, direction: str) -> np.ndarray:
        """Detect lines in specified direction"""
        if direction == 'horizontal':
            kernel_length = img.shape[1] // 40
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_length, 1))
        else:
            kernel_length = img.shape[0] // 40
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, kernel_length))

        eroded = cv2.erode(img, kernel, iterations=3)
        dilated = cv2.dilate(eroded, kernel, iterations=3)

        return dilated

    def _extract_cells(self, image: np.ndarray, table_bbox: List[int]) -> List[List[TableCell]]:
        """Extract cells from the table"""
        cells = []
        x, y, x2, y2 = table_bbox
        
        # Find cell boundaries
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # Find contours for cells
        contours, _ = cv2.findContours(binary, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        
        # Sort contours by position
        sorted_contours = sorted(contours, key=lambda c: (cv2.boundingRect(c)[1], cv2.boundingRect(c)[0]))
        
        current_row = []
        last_y = -1
        
        for idx, contour in enumerate(sorted_contours):
            cell_x, cell_y, cell_w, cell_h = cv2.boundingRect(contour)
            
            # New row detection
            if last_y >= 0 and abs(cell_y - last_y) > cell_h * 0.5:
                cells.append(current_row)
                current_row = []
            
            # Create cell
            cell = TableCell(
                text="",  # Text will be extracted by OCR later
                bbox=[x + cell_x, y + cell_y, x + cell_x + cell_w, y + cell_y + cell_h],
                confidence=0.9,
                row=len(cells),
                col=len(current_row)
            )
            
            current_row.append(cell)
            last_y = cell_y
        
        if current_row:
            cells.append(current_row)
        
        return cells

    def _identify_headers(self, header_cells: List[TableCell]) -> List[str]:
        """Identify table headers"""
        headers = []
        for cell in header_cells:
            text = cell.text.lower()
            if any(keyword in text for keyword in [
                "item", "description", "quantity", "price",
                "amount", "total", "unit", "sku", "part"
            ]):
                headers.append(text)
            else:
                headers.append(f"Column {cell.col + 1}")
        return headers