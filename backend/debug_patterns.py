#!/usr/bin/env python3
"""
Debug script to test specific regex patterns
"""

import re

def test_document_number_patterns():
    """Test different document number patterns"""
    
    sample_text = """
    INVOICE
    
    Invoice Number: INV-000038
    Date: 12/15/2023
    """
    
    patterns = [
        r'(?:invoice|inv|bill|receipt|quote|estimate|contract|agreement|order|po|purchase\s*order)[\s#:]*([A-Z0-9\-]+)',
        r'(?:number|no|#|id|identifier)[\s:]*([A-Z0-9\-]+)',
        r'(INV-\d+)',  # Full invoice number pattern - FIRST priority
        r'INV-(\d+)',  # Specific invoice pattern
        r'([A-Z]{2,}\d{4,})',  # Pattern like INV-000038
    ]
    
    print("Testing document number patterns:")
    print(f"Sample text: {repr(sample_text)}")
    print()
    
    for i, pattern in enumerate(patterns):
        matches = re.findall(pattern, sample_text, re.IGNORECASE | re.MULTILINE)
        print(f"Pattern {i+1}: {pattern}")
        print(f"  Matches: {matches}")
        if matches:
            print(f"  First match: '{matches[0]}'")
        print()

if __name__ == "__main__":
    test_document_number_patterns()
