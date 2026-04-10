import React, { useState } from 'react';
import {
  LayoutDashboard,
  List,
  Settings,
  Wallet,
  Database,
  Tag,
  PieChart,
  Home,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
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
  const [collapsed, setCollapsed] = useState(false);

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activeView === item.id;
    const showBadge = item.id === 'transactions' && transactionCount > 0;

    if (collapsed) {
      return (
        <div key={item.id} className="relative group flex justify-center">
          <button
            onClick={() => onNavigate(item.id)}
            className={`
              relative flex items-center justify-center w-9 h-9 rounded-lg
              transition-all duration-200
              ${isActive
                ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/25 shadow-sm shadow-accent-blue/10'
                : 'text-text-secondary hover:bg-bg-card hover:text-text-primary border border-transparent hover:border-border-color'
              }
            `}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-accent-blue rounded-r-full" />
            )}
            <Icon size={15} className={isActive ? 'text-accent-blue' : ''} />
            {showBadge && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 flex items-center justify-center rounded-full text-[8px] font-bold bg-accent-blue text-white leading-none">
                {transactionCount > 9 ? '9+' : transactionCount}
              </span>
            )}
          </button>
          {/* Tooltip */}
          <div className="
            pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3
            px-2.5 py-1.5 bg-bg-card border border-border-color rounded-lg
            text-xs text-text-primary font-medium whitespace-nowrap shadow-lg
            opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0
            transition-all duration-150 z-50
          ">
            {item.label}
          </div>
        </div>
      );
    }

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
    <aside className={`
      flex-shrink-0 flex flex-col bg-bg-secondary border-r border-border-color
      ${collapsed ? 'w-[60px]' : 'w-56'}
    `}>
      {/* Logo + toggle */}
      <div className={`border-b border-border-color flex items-center ${collapsed ? 'p-3 justify-center' : 'p-4 gap-3'}`}>
        {!collapsed && (
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-accent-green to-accent-blue flex items-center justify-center shadow-lg shadow-accent-blue/20 flex-shrink-0">
            <Wallet size={17} className="text-white" />
          </div>
        )}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary leading-tight tracking-tight truncate">
              Mis Gastos
            </p>
            <p className="text-xs text-text-secondary leading-tight">Finanzas personales</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className={`
            flex items-center justify-center rounded-lg text-text-secondary
            hover:text-text-primary hover:bg-bg-card border border-transparent hover:border-border-color
            transition-all duration-150 flex-shrink-0
            ${collapsed ? 'w-9 h-9' : 'w-7 h-7'}
          `}
          title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation groups */}
      <nav className={`flex-1 overflow-y-auto space-y-4 ${collapsed ? 'p-2' : 'p-3'}`}>
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-secondary/50 select-none">
                {group.label}
              </p>
            )}
            {collapsed && <div className="mb-1 h-px bg-border-color/40 mx-1" />}
            <div className={`space-y-0.5 ${collapsed ? 'flex flex-col items-center gap-0.5' : ''}`}>
              {group.items.map(renderItem)}
            </div>
          </div>
        ))}
      </nav>

      {/* System group pinned to bottom */}
      <div className={`border-t border-border-color space-y-0.5 ${collapsed ? 'p-2 flex flex-col items-center' : 'p-3'}`}>
        {!collapsed && (
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-secondary/50 select-none">
            Sistema
          </p>
        )}
        {systemItems.map(renderItem)}
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-border-color">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
            <p className="text-xs text-text-secondary">v0.1.0 · SQLite local</p>
          </div>
        </div>
      )}
    </aside>
  );
};
