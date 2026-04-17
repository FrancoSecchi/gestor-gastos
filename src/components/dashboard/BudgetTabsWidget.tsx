import React, { useEffect, useState } from 'react';
import { Home, Gamepad2, PiggyBank, ChevronDown, ChevronUp, Target, ArrowRight } from 'lucide-react';
import { Transaction, Rule502030Percentages, SavingsGoal } from '../../types';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import { calculateRule502030, DEFAULT_PERCENTAGES } from '../../lib/budgetRule';
import { Rule502030Mapping } from '../../lib/budgetRuleMapping';
import { InfoTooltip } from '../ui/InfoTooltip';
import { differenceInMonths, parseISO } from 'date-fns';

interface BudgetTabsWidgetProps {
  transactions: Transaction[];
  totalIncome: number;
  mapping: Rule502030Mapping;
  percentages?: Rule502030Percentages;
  savingsGoals: SavingsGoal[];
  onNavigateGoals: () => void;
  showBudgetTab?: boolean;
  allTransactions: Transaction[];
}

type Tab = 'budget' | 'goals';

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

function formatGoalAmount(amount: number, currency: 'ARS' | 'USD', fmtLocal: (n: number) => string): string {
  return currency === 'USD'
    ? `U$S ${amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : fmtLocal(amount);
}

function getGoalProgress(goal: SavingsGoal, allTx: Transaction[]) {
  const saved = allTx.reduce((sum, tx) => {
    if (tx.goal_id !== goal.id) return sum;
    return sum + (goal.currency === 'USD' ? (tx.amount_usd ?? 0) : tx.amount);
  }, 0);
  const pct = goal.targetAmount > 0 ? Math.min(100, (saved / goal.targetAmount) * 100) : 0;
  const monthsLeft = Math.max(0, differenceInMonths(parseISO(goal.targetDate), new Date()));
  const isCompleted = pct >= 100;
  const isPastDue = parseISO(goal.targetDate) < new Date() && !isCompleted;
  return { saved, pct, monthsLeft, isCompleted, isPastDue };
}

export const BudgetTabsWidget: React.FC<BudgetTabsWidgetProps> = ({
  transactions,
  totalIncome,
  mapping,
  percentages = DEFAULT_PERCENTAGES,
  savingsGoals,
  onNavigateGoals,
  showBudgetTab = true,
  allTransactions,
}) => {
  const { fmt } = useCurrencyFormat();
  const [tab, setTab] = useState<Tab>(showBudgetTab ? 'budget' : 'goals');
  const [mounted, setMounted] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!showBudgetTab && tab === 'budget') {
      setTab('goals');
    }
  }, [showBudgetTab, tab]);

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

  return (
    <div className="bg-bg-card border border-border-color rounded-xl overflow-hidden">

      {/* Tab bar */}
      {showBudgetTab ? (
        <div className="flex border-b border-border-color">
          <button
            onClick={() => setTab('budget')}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              tab === 'budget'
                ? 'text-text-primary border-b-2 border-accent-blue -mb-px'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Regla 50/30/20
          </button>
          <button
            onClick={() => setTab('goals')}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              tab === 'goals'
                ? 'text-text-primary border-b-2 border-accent-blue -mb-px'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Metas {savingsGoals.length > 0 && (
              <span className="ml-1 text-[10px] bg-bg-secondary text-text-secondary rounded-full px-1.5 py-0.5 tabular-nums">
                {savingsGoals.length}
              </span>
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h3 className="text-sm font-semibold text-text-primary">Metas</h3>
          {savingsGoals.length > 0 && (
            <span className="text-[10px] bg-bg-secondary text-text-secondary rounded-full px-1.5 py-0.5 tabular-nums">
              {savingsGoals.length}
            </span>
          )}
        </div>
      )}

      {/* Budget tab */}
      {tab === 'budget' && (
        <>
          {totalIncome === 0 ? (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <InfoTooltip title="Regla 50/30/20" content={TOOLTIP_CONTENT} />
              </div>
              <div className="flex flex-col items-center py-4 gap-2">
                <span className="text-3xl">💡</span>
                <p className="text-sm text-text-secondary text-center">
                  Registrá ingresos para ver el análisis.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Income header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex items-center gap-1.5">
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

                    <p className={`text-xs ${isOver ? 'text-accent-red' : 'text-text-secondary'}`}>
                      {isOver ? `Excedido por ${fmt(diff)}` : `Disponible ${fmt(diff)}`}
                    </p>

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

              {/* Footer */}
              <div className="border-t border-border-color px-4 py-3">
                <p className={`text-xs text-center ${summaryIsWarning ? 'text-accent-orange' : 'text-text-secondary'}`}>
                  Gastaste el{' '}
                  <span className={`font-semibold ${summaryIsWarning ? 'text-accent-orange' : 'text-text-primary'}`}>
                    {spentPct}%
                  </span>
                  {' '}de tu presupuesto total este período.
                </p>
              </div>
            </>
          )}
        </>
      )}

      {/* Goals tab */}
      {tab === 'goals' && (
        <>
          {savingsGoals.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2 px-4">
              <span className="text-3xl">🎯</span>
              <p className="text-sm text-text-secondary text-center">
                No tenés metas creadas todavía.
              </p>
              <button
                onClick={onNavigateGoals}
                className="flex items-center gap-1 text-xs text-accent-blue hover:underline mt-1"
              >
                Crear una meta <ArrowRight size={12} />
              </button>
            </div>
          ) : (
            <>
              <div className={`flex items-center justify-end px-4 pb-2 ${showBudgetTab ? 'pt-3' : 'pt-0'}`}>
                <button
                  onClick={onNavigateGoals}
                  className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
                >
                  Ver todas <ArrowRight size={12} />
                </button>
              </div>

              {savingsGoals.map((goal, idx) => {
                const { saved, pct, monthsLeft, isCompleted, isPastDue } = getGoalProgress(goal, allTransactions);
                const barColor = isCompleted ? '#22c55e' : isPastDue ? '#ef4444' : '#3b82f6';

                return (
                  <div key={goal.id} className="border-t border-border-color px-4 py-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Target size={13} className="shrink-0 text-text-secondary" />
                        <span className="text-sm text-text-primary font-medium truncate">{goal.name}</span>
                      </div>
                      <span className="text-xs text-text-secondary tabular-nums ml-2 shrink-0">
                        {pct.toFixed(0)}%
                      </span>
                    </div>

                    <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: mounted ? `${pct}%` : '0%',
                          backgroundColor: barColor,
                          transition: `width 0.7s cubic-bezier(0.16,1,0.3,1) ${idx * 80}ms`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-text-secondary tabular-nums">
                        {formatGoalAmount(saved, goal.currency, fmt)} de {formatGoalAmount(goal.targetAmount, goal.currency, fmt)}
                      </p>
                      {isCompleted && (
                        <p className="text-xs text-accent-green font-medium">¡Completada!</p>
                      )}
                      {!isCompleted && isPastDue && (
                        <p className="text-xs text-accent-red">Vencida</p>
                      )}
                      {!isCompleted && !isPastDue && monthsLeft > 0 && (
                        <p className="text-xs text-text-secondary">
                          {monthsLeft} {monthsLeft === 1 ? 'mes' : 'meses'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </>
      )}
    </div>
  );
};
