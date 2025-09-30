import { api } from './config';

export type Overview = {
  total_integrations?: number;
  active_integrations?: number;
  documents_processed_7d?: number;
  success_rate?: number;
};

export async function getOverview(userId: string) {
  const res = await api.get('/integrations/dashboard/dashboard/overview', { params: { user_id: userId } });
  return res.data?.summary as Overview;
}

export async function getTemplates() {
  const res = await api.get('/integrations/templates/integration-templates');
  return res.data as any[];
}

export async function getActivity(userId: string) {
  const res = await api.get('/integrations/dashboard/dashboard/activity', { params: { user_id: userId } });
  return res.data as any[];
}

export async function createEmailIntegration(params: { name: string; config: any; user_id: string; organization_id: string; }) {
  const res = await api.post('/integrations/email/email-integrations', params);
  return res.data;
}

export async function createFolderIntegration(params: { name: string; config: any; user_id: string; organization_id: string; }) {
  const res = await api.post('/integrations/folder/folder-integrations', params);
  return res.data;
}

export async function createWebhook(params: { name: string; config: any; enabled?: boolean; user_id: string; organization_id: string; }) {
  const res = await api.post('/integrations/webhook/webhooks', params);
  return res.data;
}

