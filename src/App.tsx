import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Models from './pages/Models';
import NewModel from './pages/NewModel';
import Integrations from './pages/Integrations';
import Settings from './pages/Settings';
import DocumentProcessor from './pages/DocumentProcessor';
import Templates from './pages/Templates';
import TemplateDetails from './pages/TemplateDetails';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route element={<AuthGuard><Layout /></AuthGuard>}>
        <Route index element={<Dashboard />} />
        <Route path="documents" element={<Documents />} />
        <Route path="documents/:id" element={<DocumentProcessor />} />
        <Route path="models" element={<Models />} />
        <Route path="new-model" element={<NewModel />} />
        <Route path="templates" element={<Templates />} />
        <Route path="templates/:id" element={<TemplateDetails />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
};

export default App;