import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Cpu,
  ShieldAlert,
  Compass,
  ShoppingCart,
  Settings,
  TrendingUp,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const userRoles = user?.roles.map((r) => r.name) || [];

  const checkRoleAccess = (allowed: string[]) => {
    if (!user) return false;
    if (userRoles.includes('Administrator')) return true;
    if (userRoles.includes('Operations Manager')) return true;
    return allowed.some((r) => userRoles.includes(r));
  };

  const navItems = [
    { to: '/', label: 'Dashboard Hub', icon: LayoutDashboard, roles: ['Security Staff', 'Medical Staff', 'Operations Manager'] },
    { to: '/simulation', label: 'Incident Simulator', icon: Cpu, roles: ['Operations Manager'] },
    { to: '/prediction', label: 'Crowd Predictions', icon: TrendingUp, roles: ['Operations Manager'] },
    { to: '/crowd', label: 'Crowd Intelligence', icon: Users, roles: ['Security Staff', 'Operations Manager'] },
    { to: '/ai-command', label: 'AI Command Center', icon: Cpu, roles: ['Operations Manager'] },
    { to: '/emergencies', label: 'Emergency Response', icon: ShieldAlert, roles: ['Security Staff', 'Medical Staff', 'Operations Manager'] },
    { to: '/navigation', label: 'Smart Navigation', icon: Compass, roles: ['Security Staff', 'Operations Manager'] },
    { to: '/vendors', label: 'Vendor Operations', icon: ShoppingCart, roles: ['Operations Manager'] },
    { to: '/users', label: 'User Management', icon: Users, roles: ['Administrator'] },
    { to: '/settings', label: 'System Settings', icon: Settings, roles: ['Administrator', 'Operations Manager'] }
  ];

  return (
    <aside className="w-[280px] min-w-[280px] bg-[#180F25]/95 border-r border-white/5 min-h-screen text-[#F8FAFC] flex flex-col shadow-2xl relative z-20">
      {/* Brand Header */}
      <div className="h-20 px-6 border-b border-white/5 flex flex-col justify-center bg-[#120A1D]">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#DE638A] pulse-indicator" />
          <h2 className="text-xl font-bold tracking-widest font-display text-white">STADIUMOS</h2>
        </div>
        <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest mt-0.5">Operations Console</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.filter((item) => checkRoleAccess(item.roles)).length === 0 && user && (
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-[#DE638A]/10 to-transparent text-[#DE638A] border-l-2 border-[#DE638A]'
                  : 'text-[#94A3B8] hover:bg-[#231634]/50 hover:text-white'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4 mr-3" />
            Dashboard Hub
          </NavLink>
        )}
        {navItems.map(
          (item) =>
            checkRoleAccess(item.roles) && (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#DE638A]/10 to-transparent text-[#DE638A] border-l-2 border-[#DE638A] shadow-[inset_4px_0_12px_rgba(222,99,138,0.05)]'
                      : 'text-[#94A3B8] hover:bg-[#231634]/50 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-4 h-4 mr-3" />
                {item.label}
              </NavLink>
            )
        )}
      </nav>

      {/* Footer Profile Segment */}
      <div className="p-5 border-t border-white/5 bg-[#120A1D]">
        <div className="text-[9px] text-[#94A3B8] font-bold uppercase tracking-wider">Access Scope:</div>
        <div className="text-xs font-bold text-[#F7B9C4] mt-1 truncate">
          {userRoles.length > 0 ? userRoles.join(' • ') : 'No Role Mapping'}
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;

