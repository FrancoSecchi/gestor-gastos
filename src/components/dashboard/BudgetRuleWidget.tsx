import React, { useEffect, useState } from 'react';
import { Home, Gamepad2, PiggyBank, ChevronDown, ChevronUp } from 'lucide-react';
import { Transaction, Rule502030Percentages, SavingsGoal } from '../../types';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import { calculateRule502030, DEFAULT_PERCENTAGES } from '../../lib/budgetRule';
import { Rule502030Mapping } from '../../lib/budgetRuleMapping';
import { InfoTooltip } from '../ui/InfoTooltip';

interface BudgetRuleWidgetProps {
  transactions: Transaction[];
  totalIncome: number;
  mapping: Rule502030Mapping;
  percentages?: Rule502030Percentages;
  startDate?: string;
  endDate?: string;
  savingsGoals?: SavingsGoal[];
  allTransactions?: Transaction[];
}

const GROUP_ICON: Record<string, React.ReactNode> = {
  'Necesidades': <Home size={13} className="shrink-0" />,
  'Deseos': <Gamepad2 size={13} className="shrink-0" />,
  'Ahorro/Inversión': <PiggyBank size={13} className="shrink-0" />,
};

const TOOLTIP_CONTENT = (
  <div className="space-y-3">
    <div>
      <p className="font-semibold text-text-primary mb-1">Cómo funciona</p>
      <p>Divide tus ingresos en tres grupos con límites recomendados:</p>
      <ul className="mt-1.5 space-y-0.5 pl-2">
        <li><span className="text-text-primary font-medium">50% Necesidades</span> — gastos fijos e indispensables (vivienda, comida, transporte, salud).</li>
        <li><span className="text-text-primary font-medium">30% Deseos</span> — gastos opcionales (entretenimiento, ropa, salidas).</li>
        <li><span className="text-text-primary font-medium">20% Ahorro/Inversión</span> — dinero que no gastás en el período.</li>
      </ul>
      <p className="mt-1.5">Podés cambiar los porcentajes desde la sección de configuración.</p>
    </div>
    <div>
      <p className="font-semibold text-text-primary mb-1">Barra de progreso</p>
      <p>Muestra cuánto del presupuesto de cada grupo ya usaste. Se vuelve roja cuando superás el límite asignado.</p>
    </div>
  </div>
);

export const BudgetRuleWidget: React.FC<BudgetRuleWidgetProps> = ({
  transactions,
  totalIncome,
  mapping,
  percentages = DEFAULT_PERCENTAGES,
  savingsGoals = [],
  allTransactions = [],
}) => {
  const { fmt } = useCurrencyFormat();
  const [mounted, setMounted] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const data = calculateRule502030(transactions, totalIncome, mapping, percentages);

  const totalSpent = data.reduce((sum, item) => sum + item.spent, 0);
  const spentPct = totalIncome > 0 ? Math.round((totalSpent / totalIncome) * 100) : 0;
  const summaryIsWarning = spentPct > 90;

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  if (totalIncome === 0) {
    return (
      <div className="bg-bg-card border border-border-color rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Regla 50/30/20</h3>
          <InfoTooltip title="Regla 50/30/20" content={TOOLTIP_CONTENT} />
        </div>
        <div className="flex flex-col items-center py-4 gap-2">
          <span className="text-3xl">💡</span>
          <p className="text-sm text-text-secondary text-center">
            Registrá ingresos para ver el análisis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-border-color rounded-xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-text-primary">Regla 50/30/20</h3>
          <InfoTooltip title="Regla 50/30/20" content={TOOLTIP_CONTENT} />
        </div>
        <span className="text-xs text-text-secondary tabular-nums">
          {fmt(totalIncome)} ingreso
        </span>
      </div>

      {/* Groups */}
      {data.map((item, idx) => {
        const isOver = item.spent > item.budget;
        const barWidth = item.budget > 0 ? Math.min((item.spent / item.budget) * 100, 100) : 0;
        const diff = Math.abs(item.budget - item.spent);
        const expanded = expandedGroups.has(item.group);

        return (
          <div key={item.group} className="border-t border-border-color px-4 py-3">

            {/* Name + amounts */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-1.5 text-text-secondary">
                {GROUP_ICON[item.group]}
                <span className="text-sm text-text-primary font-medium">{item.group}</span>
                <span className="text-xs text-text-secondary">({item.percentage}%)</span>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold tabular-nums ${isOver ? 'text-accent-red' : 'text-text-primary'}`}>
                  {fmt(item.spent)}
                </p>
                <p className="text-xs text-text-secondary tabular-nums">de {fmt(item.budget)}</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full rounded-full"
                style={{
                  width: mounted ? `${barWidth}%` : '0%',
                  backgroundColor: isOver ? '#ef4444' : '#3b82f6',
                  transition: `width 0.7s cubic-bezier(0.16,1,0.3,1) ${idx * 80}ms`,
                }}
              />
            </div>

            {/* Status */}
            <p className={`text-xs ${isOver ? 'text-accent-red' : 'text-text-secondary'}`}>
              {isOver ? `Excedido por ${fmt(diff)}` : `Disponible ${fmt(diff)}`}
            </p>

            {/* Categories — collapsed by default */}
            {item.categories.length > 0 && (
              <>
                <button
                  onClick={() => toggleGroup(item.group)}
                  className="flex items-center gap-1 text-xs text-text-secondary/50 hover:text-text-secondary transition-colors mt-2"
                >
                  {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  {expanded
                    ? 'Ocultar categorías'
                    : `${item.categories.length} categoría${item.categories.length !== 1 ? 's' : ''}`}
                </button>
                {expanded && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.categories.map(cat => (
                      <span
                        key={cat}
                        className="text-xs px-1.5 py-0.5 rounded-md bg-bg-secondary text-text-secondary border border-border-color/50"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* Footer summary */}
      <div className="border-t border-border-color px-4 py-3">
        <p className={`text-xs text-center ${summaryIsWarning ? 'text-accent-orange' : 'text-text-secondary'}`}>
          Gastaste el{' '}
          <span className={`font-semibold ${summaryIsWarning ? 'text-accent-orange' : 'text-text-primary'}`}>
            {spentPct}%
          </span>
          {' '}de tu presupuesto total este período.
        </p>
      </div>
    </div>
  );
};
