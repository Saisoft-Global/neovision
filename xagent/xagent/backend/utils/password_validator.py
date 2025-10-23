"""
Password validation utilities
Enforces strong password policy
"""
import re
from typing import List, Tuple

# Common passwords list (top 100 most common)
COMMON_PASSWORDS = {
    "password", "123456", "123456789", "12345678", "12345", "1234567", "password1",
    "12345678", "qwerty", "abc123", "monkey", "1234567890", "letmein", "trustno1",
    "dragon", "baseball", "111111", "iloveyou", "master", "sunshine", "ashley",
    "bailey", "passw0rd", "shadow", "123123", "654321", "superman", "qazwsx",
    "michael", "football", "welcome", "jesus", "ninja", "mustang", "password123",
    "admin", "root", "toor", "pass", "test", "guest", "info", "adm", "mysql",
    "user", "administrator", "oracle", "ftp", "pi", "puppet", "ansible", "ec2-user",
    "vagrant", "azureuser", "admin123", "root123", "pass123", "demo", "test123"
}

class PasswordValidator:
    """
    Validates password strength and enforces security policies
    """
    
    MIN_LENGTH = 12
    MAX_LENGTH = 128
    
    @staticmethod
    def validate(password: str, username: str = None) -> Tuple[bool, List[str]]:
        """
        Validate password against security policy
        
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        # Length check
        if len(password) < PasswordValidator.MIN_LENGTH:
            errors.append(f"Password must be at least {PasswordValidator.MIN_LENGTH} characters long")
        
        if len(password) > PasswordValidator.MAX_LENGTH:
            errors.append(f"Password must not exceed {PasswordValidator.MAX_LENGTH} characters")
        
        # Complexity checks
        if not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not re.search(r'\d', password):
            errors.append("Password must contain at least one number")
        
        if not re.search(r'[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/\\|`~]', password):
            errors.append("Password must contain at least one special character")
        
        # Common password check
        if password.lower() in COMMON_PASSWORDS:
            errors.append("This password is too common. Please choose a more unique password")
        
        # Username similarity check
        if username and len(username) >= 3:
            if username.lower() in password.lower():
                errors.append("Password should not contain your username")
        
        # Sequential characters check
        if PasswordValidator._has_sequential_chars(password):
            errors.append("Password should not contain sequential characters (e.g., '123', 'abc')")
        
        # Repeated characters check
        if PasswordValidator._has_repeated_chars(password):
            errors.append("Password should not contain too many repeated characters")
        
        return (len(errors) == 0, errors)
    
    @staticmethod
    def _has_sequential_chars(password: str, length: int = 3) -> bool:
        """Check for sequential characters"""
        password_lower = password.lower()
        
        # Check for sequential numbers
        for i in range(len(password_lower) - length + 1):
            substr = password_lower[i:i+length]
            if substr.isdigit():
                nums = [int(c) for c in substr]
                if all(nums[j] + 1 == nums[j+1] for j in range(len(nums)-1)):
                    return True
                if all(nums[j] - 1 == nums[j+1] for j in range(len(nums)-1)):
                    return True
        
        # Check for sequential letters
        for i in range(len(password_lower) - length + 1):
            substr = password_lower[i:i+length]
            if substr.isalpha():
                chars = [ord(c) for c in substr]
                if all(chars[j] + 1 == chars[j+1] for j in range(len(chars)-1)):
                    return True
                if all(chars[j] - 1 == chars[j+1] for j in range(len(chars)-1)):
                    return True
        
        return False
    
    @staticmethod
    def _has_repeated_chars(password: str, max_repeats: int = 3) -> bool:
        """Check for repeated characters"""
        for i in range(len(password) - max_repeats + 1):
            if len(set(password[i:i+max_repeats])) == 1:
                return True
        return False
    
    @staticmethod
    def generate_strong_password(length: int = 16) -> str:
        """Generate a strong random password"""
        import secrets
        import string
        
        # Ensure we have at least one of each required character type
        password = [
            secrets.choice(string.ascii_uppercase),
            secrets.choice(string.ascii_lowercase),
            secrets.choice(string.digits),
            secrets.choice(string.punctuation)
        ]
        
        # Fill the rest with random characters
        all_chars = string.ascii_letters + string.digits + string.punctuation
        password.extend(secrets.choice(all_chars) for _ in range(length - 4))
        
        # Shuffle to avoid predictable pattern
        secrets.SystemRandom().shuffle(password)
        
        return ''.join(password)
