import React, { useMemo } from 'react';
import { Calendar, RefreshCw, ArrowRightLeft, Paperclip } from 'lucide-react';
import { DateFilter, FilterState, DateRange, QuickFilter } from '../../types';
import { DatePicker } from '../ui/DatePicker';

interface TransactionFiltersProps {
  filters: FilterState;
  dateRange: DateRange;
  expenseCategories: string[];
  incomeCategories: string[];
  onDateFilter: (filter: DateFilter) => void;
  onCustomRange: (range: DateRange) => void;
  onTypeFilter: (type: FilterState['type']) => void;
  onCategoryFilter: (category: string) => void;
  onToggleQuickFilter: (qf: QuickFilter) => void;
  showSegmentation?: boolean;
}

const DATE_FILTER_GROUPS: { label: string; filters: DateFilter[] }[] = [
  {
    label: 'Pasado / Presente',
    filters: ['current_week', 'current_month', 'last_month', 'quarter', 'year'],
  },
  {
    label: 'Futuro',
    filters: ['next_month', 'next_quarter'],
  },
  {
    label: '',
    filters: ['custom'],
  },
];

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  current_week: 'Esta semana',
  current_month: 'Este mes',
  last_month: 'Mes anterior',
  quarter: 'Trimestre actual',
  year: 'Este año',
  next_month: 'Próximo mes',
  next_quarter: 'Próximo trimestre',
  custom: 'Personalizado',
};

const TYPE_OPTIONS: { value: FilterState['type']; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
];

const QUICK_FILTER_META: { value: QuickFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'recurring', label: 'Recurrentes', icon: <RefreshCw size={11} /> },
  { value: 'savings_transfer', label: 'Ahorros', icon: <ArrowRightLeft size={11} /> },
  { value: 'has_receipt', label: 'Con comprobante', icon: <Paperclip size={11} /> },
];

export const TransactionFilters = React.memo((props: TransactionFiltersProps) => {
  const {
    filters,
    dateRange,
    expenseCategories,
    incomeCategories,
    onDateFilter,
    onCustomRange,
    onTypeFilter,
    onCategoryFilter,
    onToggleQuickFilter,
    showSegmentation = true,
  } = props;

  const categoryOptions = useMemo(() => {
    if (filters.type === 'expense') return expenseCategories;
    if (filters.type === 'income') return incomeCategories;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of [...expenseCategories, ...incomeCategories]) {
      const k = c.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(c);
    }
    return out;
  }, [filters.type, expenseCategories, incomeCategories]);

  return (
    <div className="bg-bg-card border border-border-color rounded-xl p-4 flex flex-col gap-3">

      {/* Row 1: Date filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Calendar size={14} className="text-text-secondary shrink-0" />
        <div className="flex items-center gap-1 flex-wrap flex-1">
          {DATE_FILTER_GROUPS.map(group => (
            <div key={group.label} className="flex items-center gap-1">
              {group.label && (
                <span className="text-xs text-text-secondary/50 mr-1 hidden sm:inline">{group.label}</span>
              )}
              {group.filters.map(filter => (
                <button
                  key={filter}
                  onClick={() => onDateFilter(filter)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    filters.dateFilter === filter
                      ? 'bg-accent-blue text-white'
                      : 'bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-primary'
                  }`}
                >
                  {DATE_FILTER_LABELS[filter]}
                </button>
              ))}
              {(group.label === 'Pasado / Presente' || group.label === 'Futuro') && (
                <span className="w-px h-4 bg-border-color mx-1" />
              )}
            </div>
          ))}
        </div>

        {/* Custom range pickers */}
        {filters.dateFilter === 'custom' && (
          <div className="flex items-center gap-2">
            <DatePicker
              value={filters.customRange.start}
              onChange={start => onCustomRange({ ...filters.customRange, start })}
              className="bg-bg-secondary border border-border-color rounded-md px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-blue"
            />
            <span className="text-text-secondary text-xs">al</span>
            <DatePicker
              value={filters.customRange.end}
              onChange={end => onCustomRange({ ...filters.customRange, end })}
              className="bg-bg-secondary border border-border-color rounded-md px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-blue"
            />
          </div>
        )}

        <span className="text-xs text-text-secondary ml-auto tabular-nums">
          {dateRange.start} — {dateRange.end}
        </span>
      </div>

      {showSegmentation && <div className="h-px bg-border-color/60" />}

      {/* Row 2: Type toggle + Quick filters */}
      {showSegmentation && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">

            {/* Type segmented control */}
            <div className="flex items-center bg-bg-secondary rounded-lg p-0.5 gap-0.5">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onTypeFilter(opt.value)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                    filters.type === opt.value
                      ? 'bg-bg-card text-text-primary shadow-sm border border-border-color/60'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Quick filter chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {QUICK_FILTER_META.map(qf => {
                const active = filters.quickFilters.includes(qf.value);
                return (
                  <button
                    key={qf.value}
                    onClick={() => onToggleQuickFilter(qf.value)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                      active
                        ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue'
                        : 'bg-bg-secondary border-border-color text-text-secondary hover:text-text-primary hover:border-text-secondary/30'
                    }`}
                  >
                    {qf.icon}
                    {qf.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Category navigation */}
          {categoryOptions.length > 0 && (
            <>
              <div className="h-px bg-border-color/60" />
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-text-secondary shrink-0">Categoría:</span>
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                  <button
                    onClick={() => onCategoryFilter('')}
                    className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                      !filters.category
                        ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue'
                        : 'bg-bg-secondary border-border-color text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Todas
                  </button>
                  {categoryOptions.map(cat => (
                    <button
                      key={cat}
                      onClick={() => onCategoryFilter(filters.category === cat ? '' : cat)}
                      className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs border transition-colors whitespace-nowrap ${
                        filters.category === cat
                          ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue font-medium'
                          : 'bg-bg-secondary border-border-color text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
});
