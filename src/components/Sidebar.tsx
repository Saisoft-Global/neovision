import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Brain, 
  PlusCircle, 
  Link2, 
  Settings, 
  LogOut,
  Database,
  FileText
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Database, label: 'My Documents', path: '/documents' },
  { icon: FileText, label: 'Templates', path: '/templates' },
  { icon: Brain, label: 'My Models', path: '/models' },
  { icon: PlusCircle, label: 'New Model', path: '/new-model' },
  { icon: Link2, label: 'Integrations', path: '/integrations' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  return (
    <div className="h-screen w-64 bg-gray-900 text-white p-4 fixed left-0 top-0">
      <div className="flex items-center gap-2 mb-8 px-2">
        <Brain className="w-8 h-8 text-blue-400" />
        <h1 className="text-xl font-bold">IDP Portal</h1>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="absolute bottom-4 left-0 right-0 px-6">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;