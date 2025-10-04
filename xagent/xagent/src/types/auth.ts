import { z } from 'zod';

export const RoleSchema = z.enum(['admin', 'manager', 'user']);
export type Role = z.infer<typeof RoleSchema>;

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  permissions: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  lastLoginAt?: Date;
  roles: string[];
}

export interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

export interface AuthStore extends AuthState {
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
}