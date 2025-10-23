"""
Input validation utilities
Prevents SQL injection, XSS, and other injection attacks
"""
import re
import html
from typing import Any, Dict, List
from email_validator import validate_email as validate_email_lib, EmailNotValidError

class InputValidator:
    """
    Comprehensive input validation and sanitization
    """
    
    # Dangerous patterns that might indicate injection attacks
    SQL_INJECTION_PATTERNS = [
        r"(\bUNION\b.*\bSELECT\b)",
        r"(\bSELECT\b.*\bFROM\b)",
        r"(\bINSERT\b.*\bINTO\b)",
        r"(\bUPDATE\b.*\bSET\b)",
        r"(\bDELETE\b.*\bFROM\b)",
        r"(\bDROP\b.*\bTABLE\b)",
        r"(--|\#|\/\*|\*\/)",
        r"(\bOR\b.*=.*)",
        r"(\bAND\b.*=.*)",
        r"(';|\")",
    ]
    
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\w+\s*=",
        r"<iframe",
        r"<object",
        r"<embed",
    ]
    
    @staticmethod
    def validate_email(email: str) -> tuple[bool, str]:
        """
        Validate email address format
        
        Returns:
            Tuple of (is_valid, normalized_email or error_message)
        """
        try:
            validated = validate_email_lib(email, check_deliverability=False)
            return (True, validated.normalized)
        except EmailNotValidError as e:
            return (False, str(e))
    
    @staticmethod
    def sanitize_string(text: str, max_length: int = None) -> str:
        """
        Sanitize string input by removing dangerous characters
        """
        if not isinstance(text, str):
            return ""
        
        # HTML escape
        text = html.escape(text)
        
        # Remove null bytes
        text = text.replace('\x00', '')
        
        # Limit length if specified
        if max_length:
            text = text[:max_length]
        
        return text.strip()
    
    @staticmethod
    def check_sql_injection(text: str) -> tuple[bool, str]:
        """
        Check for SQL injection patterns
        
        Returns:
            Tuple of (is_safe, reason if unsafe)
        """
        if not isinstance(text, str):
            return (True, "")
        
        text_upper = text.upper()
        
        for pattern in InputValidator.SQL_INJECTION_PATTERNS:
            if re.search(pattern, text_upper, re.IGNORECASE):
                return (False, f"Potential SQL injection detected")
        
        return (True, "")
    
    @staticmethod
    def check_xss(text: str) -> tuple[bool, str]:
        """
        Check for XSS patterns
        
        Returns:
            Tuple of (is_safe, reason if unsafe)
        """
        if not isinstance(text, str):
            return (True, "")
        
        for pattern in InputValidator.XSS_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return (False, f"Potential XSS attack detected")
        
        return (True, "")
    
    @staticmethod
    def validate_filename(filename: str) -> tuple[bool, str]:
        """
        Validate filename for security
        
        Returns:
            Tuple of (is_valid, error_message if invalid)
        """
        if not filename:
            return (False, "Filename cannot be empty")
        
        # Check for path traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            return (False, "Filename contains invalid characters")
        
        # Check for null bytes
        if '\x00' in filename:
            return (False, "Filename contains null bytes")
        
        # Check length
        if len(filename) > 255:
            return (False, "Filename too long (max 255 characters)")
        
        # Check for valid characters (alphanumeric, dash, underscore, dot)
        if not re.match(r'^[a-zA-Z0-9._-]+$', filename):
            return (False, "Filename contains invalid characters")
        
        return (True, "")
    
    @staticmethod
    def validate_file_upload(
        filename: str,
        content_type: str,
        file_size: int,
        allowed_extensions: List[str] = None,
        max_size_mb: int = 10
    ) -> tuple[bool, str]:
        """
        Validate file upload
        
        Returns:
            Tuple of (is_valid, error_message if invalid)
        """
        # Validate filename
        is_valid, error = InputValidator.validate_filename(filename)
        if not is_valid:
            return (False, error)
        
        # Check file extension
        if allowed_extensions:
            ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
            if ext not in allowed_extensions:
                return (False, f"File type not allowed. Allowed: {', '.join(allowed_extensions)}")
        
        # Check file size
        max_size_bytes = max_size_mb * 1024 * 1024
        if file_size > max_size_bytes:
            return (False, f"File too large. Maximum size: {max_size_mb}MB")
        
        if file_size == 0:
            return (False, "File is empty")
        
        return (True, "")
    
    @staticmethod
    def validate_url(url: str) -> tuple[bool, str]:
        """
        Validate URL format and check for dangerous patterns
        
        Returns:
            Tuple of (is_valid, error_message if invalid)
        """
        if not url:
            return (False, "URL cannot be empty")
        
        # Basic URL format check
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain
            r'localhost|'  # localhost
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # or IP
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE
        )
        
        if not url_pattern.match(url):
            return (False, "Invalid URL format")
        
        # Check for javascript: protocol
        if url.lower().startswith('javascript:'):
            return (False, "JavaScript URLs not allowed")
        
        # Check for file: protocol
        if url.lower().startswith('file:'):
            return (False, "File URLs not allowed")
        
        return (True, "")
    
    @staticmethod
    def sanitize_dict(data: Dict[str, Any], max_string_length: int = 1000) -> Dict[str, Any]:
        """
        Recursively sanitize dictionary values
        """
        sanitized = {}
        
        for key, value in data.items():
            # Sanitize key
            clean_key = InputValidator.sanitize_string(str(key), max_length=100)
            
            # Sanitize value based on type
            if isinstance(value, str):
                sanitized[clean_key] = InputValidator.sanitize_string(value, max_string_length)
            elif isinstance(value, dict):
                sanitized[clean_key] = InputValidator.sanitize_dict(value, max_string_length)
            elif isinstance(value, list):
                sanitized[clean_key] = [
                    InputValidator.sanitize_string(str(item), max_string_length) if isinstance(item, str) else item
                    for item in value
                ]
            else:
                sanitized[clean_key] = value
        
        return sanitized
