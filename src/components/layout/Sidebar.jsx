import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  BarChart2,
  ClipboardList,
  History,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function Sidebar() {
  const { role } = useAuth();
  const navigate = useNavigate();

  // Admin nav — four items per spec
  const adminNav = [
    { label: 'Overview',      path: '/dashboard', icon: LayoutDashboard, end: true },
    { label: 'Tasks',         path: '/tasks',     icon: CheckSquare,     end: false },
    { label: 'Progress Logs', path: '/progress',  icon: BarChart2,       end: true },
  ];

  // User nav — three items per spec
  const userNav = [
    { label: 'My Tasks',      path: '/tasks',    icon: CheckSquare, end: false },
    { label: 'Log Progress',  path: '/progress',  icon: ClipboardList, end: true },
    { label: 'My History',    path: '/history',   icon: History,       end: true },
  ];

  const navItems = role === 'admin' ? adminNav : userNav;

  return (
    <aside className="w-56 bg-white border-r border-slate-200 hidden md:flex flex-col h-full sticky top-0">
      <div className="h-14 flex items-center px-5 border-b border-slate-200">
        <span className="text-base font-bold text-slate-800">BLYU SOLUTIONS</span>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {/* Regular nav items */}
        {navItems.map((item) => (
          <NavLink
            key={item.path + item.label}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-slate-200">
        <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">
          {role}
        </span>
      </div>
    </aside>
  );
}
