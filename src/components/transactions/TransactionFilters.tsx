import React, { useMemo } from 'react';
import { Calendar, Filter } from 'lucide-react';
import { DateFilter, FilterState, DateRange } from '../../types';
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

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  filters,
  dateRange,
  expenseCategories,
  incomeCategories,
  onDateFilter,
  onCustomRange,
  onTypeFilter,
  onCategoryFilter,
}) => {
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
    <div className="bg-bg-card border border-border-color rounded-xl p-4">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Date filter */}
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <Calendar size={14} className="text-text-secondary shrink-0" />
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

        {/* Custom range */}
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

        {/* Date range display */}
        <span className="text-xs text-text-secondary ml-auto">
          {dateRange.start} — {dateRange.end}
        </span>
      </div>
    </div>
  );
};
