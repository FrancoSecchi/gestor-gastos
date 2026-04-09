import React from 'react';
import {
  LayoutDashboard,
  List,
  Brain,
  Settings,
  Wallet,
  Database,
  Tag,
  PieChart,
  Home,
  PiggyBank,
} from 'lucide-react';

export type ActiveView = 'dashboard' | 'transactions' | 'analysis' | 'categories' | 'rule502030' | 'vivienda' | 'ahorros' | 'settings' | 'database';

interface SidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  transactionCount?: number;
}

interface NavItem {
  id: ActiveView;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'transactions', label: 'Transacciones', icon: List },
    ],
  },
  {
    label: 'Análisis',
    items: [
      /* { id: 'analysis', label: 'Análisis IA', icon: Brain }, */
      { id: 'rule502030', label: 'Regla 50/30/20', icon: PieChart },
      { id: 'ahorros', label: 'Ahorros', icon: PiggyBank },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { id: 'categories', label: 'Categorías', icon: Tag },
      { id: 'vivienda', label: 'Vivienda', icon: Home },
    ],
  },
];

const systemItems: NavItem[] = [
  { id: 'settings', label: 'Configuración', icon: Settings },
  { id: 'database', label: 'Base de datos', icon: Database },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, transactionCount = 0 }) => {
  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activeView === item.id;
    const showBadge = item.id === 'transactions' && transactionCount > 0;

    return (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        className={`
          relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
          transition-all duration-200
          ${isActive
            ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/25 shadow-sm shadow-accent-blue/10'
            : 'text-text-secondary hover:bg-bg-card hover:text-text-primary border border-transparent hover:border-border-color'
          }
        `}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent-blue rounded-r-full" />
        )}
        <Icon size={16} className={isActive ? 'text-accent-blue' : ''} />
        <span className="flex-1 text-left">{item.label}</span>
        {showBadge && (
          <span className={`
            text-xs px-1.5 py-0.5 rounded-full font-semibold min-w-5 text-center leading-none
            ${isActive
              ? 'bg-accent-blue/30 text-accent-blue'
              : 'bg-bg-card text-text-secondary border border-border-color'
            }
          `}>
            {transactionCount > 99 ? '99+' : transactionCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-bg-secondary border-r border-border-color">
      {/* Logo */}
      <div className="p-5 border-b border-border-color">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-accent-green to-accent-blue flex items-center justify-center shadow-lg shadow-accent-blue/20 flex-shrink-0">
            <Wallet size={17} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary leading-tight tracking-tight">
              Mis Gastos
            </p>
            <p className="text-xs text-text-secondary leading-tight">Finanzas personales</p>
          </div>
        </div>
      </div>

      {/* Navigation groups */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-secondary/50 select-none">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(renderItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* System group pinned to bottom */}
      <div className="p-3 border-t border-border-color space-y-0.5">
        <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-secondary/50 select-none">
          Sistema
        </p>
        {systemItems.map(renderItem)}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border-color">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
          <p className="text-xs text-text-secondary">v0.1.0 · SQLite local</p>
        </div>
      </div>
    </aside>
  );
};
