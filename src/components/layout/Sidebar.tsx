import React, { useState } from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Settings,
  Wallet,
  Database,
  Tag,
  PieChart,
  Home,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

export type ActiveView = 'dashboard' | 'transactions' | 'analysis' | 'categories' | 'budgetRule' | 'housing' | 'savings' | 'settings' | 'database';

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
  id: string;
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    id: 'principal',
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
      { id: 'transactions', label: 'Movimientos', icon: ArrowLeftRight },
    ],
  },
  {
    id: 'finanzas',
    label: 'Finanzas',
    items: [
      { id: 'savings', label: 'Ahorros', icon: PiggyBank },
      { id: 'budgetRule', label: 'Metas', icon: PieChart },
      { id: 'housing', label: 'Vivienda', icon: Home },
    ],
  },
  {
    id: 'config',
    label: 'Configuración',
    items: [
      { id: 'categories', label: 'Categorías', icon: Tag },
      { id: 'settings', label: 'Ajustes', icon: Settings },
      { id: 'database', label: 'Base de datos', icon: Database },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, transactionCount = 0 }) => {
  const [collapsed, setCollapsed] = useState(false);

  // Which group contains the active view
  const activeGroupId = navGroups.find(g => g.items.some(i => i.id === activeView))?.id ?? 'principal';

  // Open groups state — active group always open by default
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navGroups.map(g => [g.id, true]))
  );

  // Auto-open group when navigating to it
  const handleNavigate = (view: ActiveView) => {
    const group = navGroups.find(g => g.items.some(i => i.id === view));
    if (group) {
      setOpenGroups(prev => ({ ...prev, [group.id]: true }));
    }
    onNavigate(view);
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activeView === item.id;
    const showBadge = item.id === 'transactions' && transactionCount > 0;

    if (collapsed) {
      return (
        <div key={item.id} className="relative group flex justify-center">
          <button
            onClick={() => handleNavigate(item.id)}
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
            <Icon size={15} />
            {showBadge && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 flex items-center justify-center rounded-full text-[8px] font-bold bg-accent-blue text-white leading-none">
                {transactionCount > 9 ? '9+' : transactionCount}
              </span>
            )}
          </button>
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
        onClick={() => handleNavigate(item.id)}
        className={`
          relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
          transition-all duration-200
          ${isActive
            ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/25 shadow-sm shadow-accent-blue/10 font-medium'
            : 'text-text-secondary hover:bg-bg-card hover:text-text-primary border border-transparent hover:border-border-color font-normal'
          }
        `}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent-blue rounded-r-full" />
        )}
        <Icon size={15} className="flex-shrink-0" />
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
      transition-all duration-200
      ${collapsed ? 'w-[60px]' : 'w-52'}
    `}>
      {/* Logo + toggle */}
      <div className={`border-b border-border-color flex items-center ${collapsed ? 'p-3 justify-center' : 'p-4 gap-3'}`}>
        {!collapsed && (
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-accent-green to-accent-blue flex items-center justify-center shadow-lg shadow-accent-blue/20 flex-shrink-0">
            <Wallet size={15} className="text-white" />
          </div>
        )}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary leading-tight tracking-tight truncate">
              Mis Gastos
            </p>
            <p className="text-[10px] text-text-secondary leading-tight">Finanzas personales</p>
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
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto ${collapsed ? 'p-2 space-y-1' : 'p-2.5 space-y-0.5'}`}>
        {navGroups.map((group) => {
          const isOpen = openGroups[group.id] ?? false;
          const hasActive = group.items.some(i => i.id === activeView);

          if (collapsed) {
            return (
              <div key={group.id} className="flex flex-col items-center gap-0.5 pb-1.5 border-b border-border-color/40 last:border-0">
                {group.items.map(renderItem)}
              </div>
            );
          }

          return (
            <div key={group.id}>
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-bg-card/50 transition-colors group"
              >
                <span className={`text-[10px] font-semibold uppercase tracking-widest select-none transition-colors ${
                  hasActive ? 'text-text-secondary' : 'text-text-secondary/40 group-hover:text-text-secondary/70'
                }`}>
                  {group.label}
                </span>
                <ChevronDown
                  size={11}
                  className={`text-text-secondary/40 group-hover:text-text-secondary/70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="space-y-0.5 mt-0.5 mb-1.5">
                  {group.items.map(renderItem)}
                </div>
              )}
            </div>
          );
        })}
      </nav>

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
