import { BrowserRouter } from 'react-router-dom';
import { ConnectionStatus } from './components/common/ConnectionStatus';
import { AppRoutes } from './routes';

export const App = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <AppRoutes />
        <ConnectionStatus />
      </div>
    </BrowserRouter>
  );
};