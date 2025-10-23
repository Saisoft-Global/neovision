import { z } from 'zod';

// User schema
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  avatar: z.string().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type User = z.infer<typeof UserSchema>;

// Role schema
export const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  permissions: z.array(z.string()),
  description: z.string().optional(),
});

export type Role = z.infer<typeof RoleSchema>;

// Permission schema
export const PermissionSchema = z.object({
  id: z.string(),
  name: z.string(),
  resource: z.string(),
  action: z.string(),
  description: z.string().optional(),
});

export type Permission = z.infer<typeof PermissionSchema>;

// Auth store interface
export interface AuthStore {
  user: User | null;
  session: any;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
}

// Login credentials schema
export const LoginCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  rememberMe: z.boolean().optional(),
});

export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;

// Registration schema
export const RegistrationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  name: z.string().min(2),
  agreeToTerms: z.boolean(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type RegistrationData = z.infer<typeof RegistrationSchema>;

// Password reset schema
export const PasswordResetSchema = z.object({
  email: z.string().email(),
});

export type PasswordResetData = z.infer<typeof PasswordResetSchema>;

// Auth result interface
export interface AuthResult {
  user: User | null;
  token?: string;
  error?: string;
}

// Session interface
export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}