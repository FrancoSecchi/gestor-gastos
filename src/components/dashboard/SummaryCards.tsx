import React from 'react';
import { TrendingUp, TrendingDown, Scale, PiggyBank } from 'lucide-react';
import { Summary } from '../../types';
import { formatARS } from '../../lib/export';

interface SummaryCardsProps {
  summary: Summary | null;
  loading: boolean;
  onOpenForm?: (type: 'income' | 'expense') => void;
}

function weeksRemainingInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = lastDay - now.getDate() + 1;
  return Math.max(daysLeft / 7, 1 / 7);
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, loading, onOpenForm }) => {
  const balance = summary?.balance ?? 0;
  const balancePositive = balance >= 0;
  const weeksLeft = weeksRemainingInMonth();
  const perWeek = balance > 0 ? balance / weeksLeft : 0;
  const savingsRate = summary && summary.total_income > 0
    ? (summary.balance / summary.total_income) * 100
    : 0;

  const cards = [
    {
      label: 'Ingresos',
      value: summary?.total_income ?? 0,
      icon: TrendingUp,
      textColor: 'text-accent-green',
      borderColor: 'border-accent-green/20',
      bgColor: 'bg-accent-green/10',
      iconBg: 'bg-accent-green/15',
      glowColor: 'shadow-accent-green/10',
      isPercentage: false,
      prefix: '+',
      actionType: 'income' as const,
    },
    {
      label: 'Gastos',
      value: summary?.total_expenses ?? 0,
      icon: TrendingDown,
      textColor: 'text-accent-red',
      borderColor: 'border-accent-red/20',
      bgColor: 'bg-accent-red/10',
      iconBg: 'bg-accent-red/15',
      glowColor: 'shadow-accent-red/10',
      isPercentage: false,
      prefix: '-',
      actionType: 'expense' as const,
    },
    {
      label: 'Balance',
      value: balance,
      icon: Scale,
      textColor: balancePositive ? 'text-accent-blue' : 'text-accent-orange',
      borderColor: balancePositive ? 'border-accent-blue/20' : 'border-accent-orange/20',
      bgColor: balancePositive ? 'bg-accent-blue/10' : 'bg-accent-orange/10',
      iconBg: balancePositive ? 'bg-accent-blue/15' : 'bg-accent-orange/15',
      glowColor: balancePositive ? 'shadow-accent-blue/10' : 'shadow-accent-orange/10',
      isPercentage: false,
      prefix: balancePositive ? '+' : '-',
      actionType: null,
    },
    {
      label: 'Tasa de Ahorro',
      value: savingsRate,
      icon: PiggyBank,
      textColor: savingsRate >= 20 ? 'text-accent-green' : savingsRate >= 10 ? 'text-accent-yellow' : 'text-accent-orange',
      borderColor: savingsRate >= 20 ? 'border-accent-green/20' : savingsRate >= 10 ? 'border-accent-yellow/20' : 'border-accent-orange/20',
      bgColor: savingsRate >= 20 ? 'bg-accent-green/10' : savingsRate >= 10 ? 'bg-accent-yellow/10' : 'bg-accent-orange/10',
      iconBg: savingsRate >= 20 ? 'bg-accent-green/15' : savingsRate >= 10 ? 'bg-accent-yellow/15' : 'bg-accent-orange/15',
      glowColor: 'shadow-accent-yellow/10',
      isPercentage: true,
      prefix: '',
      actionType: null,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {cards.map((_, i) => (
          <div key={i} className="bg-bg-card border border-border-color rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="skeleton h-3 w-16" />
              <div className="skeleton w-7 h-7 rounded-lg" />
            </div>
            <div className="skeleton h-6 w-28 mb-1" />
            <div className="skeleton h-2.5 w-full mt-2 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const displayValue = card.isPercentage
          ? Math.abs(card.value)
          : Math.abs(card.value);

        // Mini progress bar for savings rate
        const showProgress = card.isPercentage;
        const progressPct = Math.min(Math.abs(card.value), 100);

        const isClickable = !!card.actionType && !!onOpenForm;

        return (
          <div
            key={card.label}
            className={`
              bg-bg-card border ${card.borderColor} rounded-xl p-4
              card-hover animate-fade-in shadow-lg ${card.glowColor}
              ${isClickable ? 'cursor-pointer' : ''}
            `}
            style={{ animationDelay: `${idx * 60}ms` }}
            onClick={isClickable ? () => onOpenForm(card.actionType!) : undefined}
            title={isClickable ? `Agregar ${card.label === 'Ingresos' ? 'ingreso' : 'gasto'}` : undefined}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`${card.iconBg} p-1.5 rounded-lg`}>
                <Icon size={14} className={card.textColor} />
              </div>
            </div>

            <p className={`text-xl font-bold ${card.textColor} tabular-nums`}>
              {card.isPercentage
                ? `${displayValue.toFixed(1)}%`
                : `${card.prefix}$${formatARS(displayValue)}`
              }
            </p>

            {card.label === 'Balance' && balance > 0 && (
              <p className="text-xs text-text-secondary mt-1 tabular-nums">
                <span className="text-text-primary font-semibold">${formatARS(Math.round(perWeek))}</span> por semana
              </p>
            )}

            {showProgress && (
              <div className="mt-2.5">
                <div className="h-1 bg-bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progressPct}%`,
                      background: progressPct >= 20
                        ? 'linear-gradient(90deg, #22c55e, #10b981)'
                        : progressPct >= 10
                        ? 'linear-gradient(90deg, #eab308, #f97316)'
                        : 'linear-gradient(90deg, #ef4444, #f97316)',
                    }}
                  />
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {progressPct >= 20 ? 'Excelente ahorro' : progressPct >= 10 ? 'Ahorro moderado' : 'Ahorro bajo'}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
