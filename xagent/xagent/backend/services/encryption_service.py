"""
Encryption service for sensitive data
Uses Fernet (symmetric encryption) for data at rest
"""
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
from cryptography.hazmat.backends import default_backend
import base64
import os
from typing import Optional

class EncryptionService:
    """
    Service for encrypting and decrypting sensitive data
    """
    
    def __init__(self):
        # Get encryption key from environment
        encryption_key = os.getenv("ENCRYPTION_KEY")
        
        if not encryption_key:
            raise ValueError(
                "ENCRYPTION_KEY environment variable must be set. "
                "Generate one with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )
        
        self.fernet = Fernet(encryption_key.encode())
    
    def encrypt(self, data: str) -> str:
        """
        Encrypt a string
        
        Args:
            data: Plain text string to encrypt
            
        Returns:
            Base64 encoded encrypted string
        """
        if not data:
            return ""
        
        encrypted = self.fernet.encrypt(data.encode())
        return base64.urlsafe_b64encode(encrypted).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """
        Decrypt a string
        
        Args:
            encrypted_data: Base64 encoded encrypted string
            
        Returns:
            Decrypted plain text string
        """
        if not encrypted_data:
            return ""
        
        try:
            decoded = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted = self.fernet.decrypt(decoded)
            return decrypted.decode()
        except Exception as e:
            raise ValueError(f"Decryption failed: {str(e)}")
    
    def encrypt_dict(self, data: dict, fields_to_encrypt: list) -> dict:
        """
        Encrypt specific fields in a dictionary
        
        Args:
            data: Dictionary containing data
            fields_to_encrypt: List of field names to encrypt
            
        Returns:
            Dictionary with encrypted fields
        """
        encrypted_data = data.copy()
        
        for field in fields_to_encrypt:
            if field in encrypted_data and encrypted_data[field]:
                encrypted_data[field] = self.encrypt(str(encrypted_data[field]))
        
        return encrypted_data
    
    def decrypt_dict(self, data: dict, fields_to_decrypt: list) -> dict:
        """
        Decrypt specific fields in a dictionary
        
        Args:
            data: Dictionary containing encrypted data
            fields_to_decrypt: List of field names to decrypt
            
        Returns:
            Dictionary with decrypted fields
        """
        decrypted_data = data.copy()
        
        for field in fields_to_decrypt:
            if field in decrypted_data and decrypted_data[field]:
                try:
                    decrypted_data[field] = self.decrypt(decrypted_data[field])
                except Exception:
                    # If decryption fails, leave as is (might not be encrypted)
                    pass
        
        return decrypted_data

# Singleton instance
_encryption_service: Optional[EncryptionService] = None

def get_encryption_service() -> EncryptionService:
    """Get singleton encryption service instance"""
    global _encryption_service
    
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    
    return _encryption_service
