import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import type { User, Role } from '../types/auth';

export function useUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      setUsers(prev => prev.filter(user => user.id !== userId));
    } catch (err) {
      console.error('Failed to delete user:', err);
      throw err;
    }
  }, []);

  const updateUserRole = useCallback(async (userId: string, role: Role) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId);

      if (error) throw error;
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role } : user
      ));
    } catch (err) {
      console.error('Failed to update user role:', err);
      throw err;
    }
  }, []);

  return { users, isLoading, error, deleteUser, updateUserRole };
}