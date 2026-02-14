
import React from 'react';
import { NavLink } from 'react-router-dom';
import { DashboardIcon, DeviceIcon, TemplateIcon, ComplianceIcon } from './icons';

const navItems = [
  { path: '/dashboard', name: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/devices', name: 'Devices', icon: <DeviceIcon /> },
  { path: '/templates', name: 'Templates', icon: <TemplateIcon /> },
  { path: '/topology', name: 'Topology Viewer', icon: <ComplianceIcon /> },
];

const Sidebar: React.FC = () => {
  const linkClasses = "flex items-center px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors duration-200";
  const activeLinkClasses = "bg-slate-700 text-white";

  return (
    <aside className="w-64 bg-slate-800 p-4 flex flex-col">
      <div className="flex items-center mb-8">
        <h1 className="text-2xl font-bold text-white tracking-wider">Velocity</h1>
      </div>
      <nav className="flex flex-col space-y-2">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`}
          >
            {item.icon}
            <span className="ml-4">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
