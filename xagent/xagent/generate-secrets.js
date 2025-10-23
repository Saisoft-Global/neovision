#!/usr/bin/env node

/**
 * Generate secure secrets for the application
 * Run this script to generate all required secrets
 */

const crypto = require('crypto');

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('base64url');
}

function generateEncryptionKey() {
  // Generate Fernet-compatible key (32 bytes base64 encoded)
  const key = crypto.randomBytes(32);
  return key.toString('base64');
}

function generatePassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  
  // Ensure at least one of each type
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '!@#$%^&*()_+-='[Math.floor(Math.random() * 14)];
  
  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

console.log('🔐 SECURE SECRETS GENERATOR');
console.log('=' .repeat(60));
console.log('\n📝 Copy these values to your .env file:\n');

console.log('# Security Keys');
console.log(`SECRET_KEY=${generateSecret()}`);
console.log(`ENCRYPTION_KEY=${generateEncryptionKey()}`);

console.log('\n# Database Passwords');
console.log(`NEO4J_PASSWORD=${generatePassword()}`);
console.log(`REDIS_PASSWORD=${generatePassword()}`);

console.log('\n# Optional: Additional Secrets');
console.log(`SESSION_SECRET=${generateSecret()}`);
console.log(`API_SECRET=${generateSecret()}`);

console.log('\n' + '='.repeat(60));
console.log('✅ Secrets generated successfully!');
console.log('\n⚠️  IMPORTANT:');
console.log('   1. Copy these values to your .env file');
console.log('   2. NEVER commit .env to version control');
console.log('   3. Store these secrets securely');
console.log('   4. Rotate secrets regularly in production');
console.log('=' .repeat(60) + '\n');
