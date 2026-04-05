import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Bot, Filter, MessageSquare, Settings, Zap } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/models', icon: Bot, label: 'Modele AI' },
  { to: '/filters', icon: Filter, label: 'Filtry' },
  { to: '/chains', icon: Zap, label: 'Łańcuchy' },
  { to: '/chat', icon: MessageSquare, label: 'Chat Testowy' },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
            <Filter className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">AI Filters</h1>
            <p className="text-xs text-muted-foreground">Pipeline Manager</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-sidebar-accent text-primary glow-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="glass rounded-lg p-4">
          <p className="text-xs text-muted-foreground font-mono">v1.0 · Local Storage</p>
          <p className="text-xs text-muted-foreground mt-1">Dane zapisywane lokalnie</p>
        </div>
      </div>
    </aside>
  );
}
