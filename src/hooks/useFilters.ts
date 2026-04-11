import { useState, useMemo } from 'react';
import { FilterState, DateFilter, DateRange, QuickFilter } from '../types';
import {
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  subMonths, addMonths,
  startOfQuarter, endOfQuarter, addQuarters,
  startOfYear, endOfYear,
  format,
} from 'date-fns';

export function getDateRange(filter: DateFilter, customRange: DateRange): DateRange {
  const now = new Date();
  switch (filter) {
    case 'current_week': {
      return {
        start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };
    }
    case 'current_month': {
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
    }
    case 'last_month': {
      const lastMonth = subMonths(now, 1);
      return {
        start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        end: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
      };
    }
    case 'quarter': {
      return {
        start: format(startOfQuarter(now), 'yyyy-MM-dd'),
        end: format(endOfQuarter(now), 'yyyy-MM-dd'),
      };
    }
    case 'year': {
      return {
        start: format(startOfYear(now), 'yyyy-MM-dd'),
        end: format(endOfYear(now), 'yyyy-MM-dd'),
      };
    }
    case 'next_month': {
      const nextMonth = addMonths(now, 1);
      return {
        start: format(startOfMonth(nextMonth), 'yyyy-MM-dd'),
        end: format(endOfMonth(nextMonth), 'yyyy-MM-dd'),
      };
    }
    case 'next_quarter': {
      const nextQuarter = addQuarters(now, 1);
      return {
        start: format(startOfQuarter(nextQuarter), 'yyyy-MM-dd'),
        end: format(endOfQuarter(nextQuarter), 'yyyy-MM-dd'),
      };
    }
    case 'custom': {
      return customRange;
    }
    default:
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
  }
}

export function useFilters() {
  const [filters, setFilters] = useState<FilterState>({
    dateFilter: 'current_month',
    customRange: {
      start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    },
    type: 'all',
    category: '',
    quickFilters: [],
  });

  const dateRange = useMemo(
    () => getDateRange(filters.dateFilter, filters.customRange),
    [filters.dateFilter, filters.customRange]
  );

  const setDateFilter = (filter: DateFilter) => {
    setFilters(prev => ({ ...prev, dateFilter: filter }));
  };

  const setCustomRange = (range: DateRange) => {
    setFilters(prev => ({ ...prev, customRange: range, dateFilter: 'custom' }));
  };

  const setTypeFilter = (type: FilterState['type']) => {
    setFilters(prev => ({ ...prev, type, category: '' }));
  };

  const setCategoryFilter = (category: string) => {
    setFilters(prev => ({ ...prev, category }));
  };

  const toggleQuickFilter = (qf: QuickFilter) => {
    setFilters(prev => {
      const active = prev.quickFilters.includes(qf);
      return {
        ...prev,
        quickFilters: active
          ? prev.quickFilters.filter(f => f !== qf)
          : [...prev.quickFilters, qf],
      };
    });
  };

  return {
    filters,
    dateRange,
    setDateFilter,
    setCustomRange,
    setTypeFilter,
    setCategoryFilter,
    toggleQuickFilter,
  };
}
