/**
 * Password validation utilities for frontend
 * Matches backend password policy
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  score: number;
}

const COMMON_PASSWORDS = new Set([
  'password', '123456', '123456789', '12345678', '12345', '1234567', 'password1',
  'qwerty', 'abc123', 'monkey', '1234567890', 'letmein', 'trustno1',
  'dragon', 'baseball', '111111', 'iloveyou', 'master', 'sunshine', 'ashley',
  'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman', 'qazwsx',
  'michael', 'football', 'welcome', 'jesus', 'ninja', 'mustang', 'password123',
  'admin', 'root', 'toor', 'pass', 'test', 'guest', 'info', 'adm', 'mysql',
  'user', 'administrator', 'oracle', 'ftp', 'admin123', 'root123', 'pass123'
]);

export class PasswordValidator {
  private static readonly MIN_LENGTH = 12;
  private static readonly MAX_LENGTH = 128;

  /**
   * Validate password against security policy
   */
  static validate(password: string, username?: string): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Length check
    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
    } else {
      score += Math.min(20, password.length - this.MIN_LENGTH);
    }

    if (password.length > this.MAX_LENGTH) {
      errors.push(`Password must not exceed ${this.MAX_LENGTH} characters`);
    }

    // Complexity checks
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};:'",.<>?/\\|`~]/.test(password);

    if (!hasUppercase) {
      errors.push('Password must contain at least one uppercase letter');
    } else {
      score += 15;
    }

    if (!hasLowercase) {
      errors.push('Password must contain at least one lowercase letter');
    } else {
      score += 15;
    }

    if (!hasNumber) {
      errors.push('Password must contain at least one number');
    } else {
      score += 15;
    }

    if (!hasSpecial) {
      errors.push('Password must contain at least one special character');
    } else {
      score += 20;
    }

    // Common password check
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
      errors.push('This password is too common. Please choose a more unique password');
      score = Math.max(0, score - 30);
    }

    // Username similarity check
    if (username && username.length >= 3) {
      if (password.toLowerCase().includes(username.toLowerCase())) {
        errors.push('Password should not contain your username');
        score = Math.max(0, score - 20);
      }
    }

    // Sequential characters check
    if (this.hasSequentialChars(password)) {
      errors.push('Password should not contain sequential characters (e.g., "123", "abc")');
      score = Math.max(0, score - 15);
    }

    // Repeated characters check
    if (this.hasRepeatedChars(password)) {
      errors.push('Password should not contain too many repeated characters');
      score = Math.max(0, score - 10);
    }

    // Bonus for variety
    const uniqueChars = new Set(password).size;
    score += Math.min(15, uniqueChars);

    // Determine strength
    let strength: PasswordValidationResult['strength'];
    if (score < 30) strength = 'weak';
    else if (score < 50) strength = 'fair';
    else if (score < 70) strength = 'good';
    else if (score < 85) strength = 'strong';
    else strength = 'very-strong';

    return {
      isValid: errors.length === 0,
      errors,
      strength,
      score: Math.min(100, score)
    };
  }

  /**
   * Check for sequential characters
   */
  private static hasSequentialChars(password: string, length: number = 3): boolean {
    const passwordLower = password.toLowerCase();

    // Check for sequential numbers
    for (let i = 0; i <= passwordLower.length - length; i++) {
      const substr = passwordLower.substring(i, i + length);
      if (/^\d+$/.test(substr)) {
        const nums = substr.split('').map(Number);
        const isAscending = nums.every((n, idx) => idx === 0 || n === nums[idx - 1] + 1);
        const isDescending = nums.every((n, idx) => idx === 0 || n === nums[idx - 1] - 1);
        if (isAscending || isDescending) return true;
      }
    }

    // Check for sequential letters
    for (let i = 0; i <= passwordLower.length - length; i++) {
      const substr = passwordLower.substring(i, i + length);
      if (/^[a-z]+$/.test(substr)) {
        const chars = substr.split('').map(c => c.charCodeAt(0));
        const isAscending = chars.every((c, idx) => idx === 0 || c === chars[idx - 1] + 1);
        const isDescending = chars.every((c, idx) => idx === 0 || c === chars[idx - 1] - 1);
        if (isAscending || isDescending) return true;
      }
    }

    return false;
  }

  /**
   * Check for repeated characters
   */
  private static hasRepeatedChars(password: string, maxRepeats: number = 3): boolean {
    for (let i = 0; i <= password.length - maxRepeats; i++) {
      const substr = password.substring(i, i + maxRepeats);
      if (new Set(substr).size === 1) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generate a strong random password
   */
  static generateStrongPassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const all = uppercase + lowercase + numbers + special;

    // Ensure at least one of each type
    let password = [
      uppercase[Math.floor(Math.random() * uppercase.length)],
      lowercase[Math.floor(Math.random() * lowercase.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      special[Math.floor(Math.random() * special.length)]
    ];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password.push(all[Math.floor(Math.random() * all.length)]);
    }

    // Shuffle
    for (let i = password.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [password[i], password[j]] = [password[j], password[i]];
    }

    return password.join('');
  }
}
