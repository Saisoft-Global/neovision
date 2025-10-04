import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';

export function useAdminSettings() {
  const [settings, setSettings] = useState({
    enableUserRegistration: true,
    maxFileSize: '10',
    debugMode: false,
    maintenanceMode: false,
  });

  const updateSetting = useCallback(async (key: string, value: unknown) => {
    try {
      const { error } = await supabase
        .from('admin_settings')
        .upsert({ key, value });

      if (error) throw error;

      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  }, []);

  return { settings, updateSetting };
}