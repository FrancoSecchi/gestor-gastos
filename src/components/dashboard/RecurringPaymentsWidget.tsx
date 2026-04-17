import React, { useState } from 'react';
import { Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';
import { RecurringPayment, Transaction, RECURRENCE_LABELS } from '../../types';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import { getCurrentPeriodRange } from '../../hooks/useRecurringPayments';

interface RecurringPaymentsWidgetProps {
  recurringPayments: RecurringPayment[];
  currentMonthTransactions: Transaction[];
  categoryIcons: Record<string, string>;
  onRegisterPayment: (recurring: RecurringPayment) => void;
  onDeleteRecurring: (id: string) => void;
  onToggleRecurring: (id: string, active: boolean) => void;
}

function isPaidInCurrentPeriod(rp: RecurringPayment, transactions: Transaction[]): boolean {
  const { start, end } = getCurrentPeriodRange(rp.frequency);
  return transactions.some(
    t => t.recurring_id === rp.id && t.date >= start && t.date <= end
  );
}

export const RecurringPaymentsWidget = React.memo((props: RecurringPaymentsWidgetProps) => {
  const {
    recurringPayments,
    currentMonthTransactions,
    categoryIcons,
    onRegisterPayment,
    onDeleteRecurring,
    onToggleRecurring,
  } = props;
  const { fmt } = useCurrencyFormat();
  const [collapsed, setCollapsed] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const active = recurringPayments.filter(r => r.is_active === 1);
  const inactive = recurringPayments.filter(r => r.is_active === 0);

  if (recurringPayments.length === 0) return null;

  const paidCount = active.filter(r => isPaidInCurrentPeriod(r, currentMonthTransactions)).length;
  const pendingCount = active.length - paidCount;

  return (
    <div className="bg-bg-card border border-border-color rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent-blue/15 flex items-center justify-center text-sm">
            🔁
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-text-primary">Pagos recurrentes</p>
            <p className="text-xs text-text-secondary">
              {paidCount} de {active.length} pagados
              {pendingCount > 0 && (
                <span className="ml-1.5 text-accent-red font-medium">· faltan {pendingCount}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-accent-red/15 text-accent-red">
              {pendingCount}
            </span>
          )}
          {paidCount === active.length && active.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-accent-green/15 text-accent-green">
              ✓ Al día
            </span>
          )}
          {collapsed ? <ChevronDown size={14} className="text-text-secondary" /> : <ChevronUp size={14} className="text-text-secondary" />}
        </div>
      </button>

      {!collapsed && (
        <div className="border-t border-border-color">
          {/* Active recurring payments */}
          <div className="divide-y divide-border-color/60">
            {active.map(rp => {
              const paid = isPaidInCurrentPeriod(rp, currentMonthTransactions);
              const icon = categoryIcons[rp.category] ?? '💳';
              return (
                <div
                  key={rp.id}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${paid ? 'opacity-60' : 'hover:bg-bg-secondary/30'}`}
                >
                  <span className="text-base w-6 text-center flex-shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">
                      {rp.description || rp.category}
                      {rp.description && rp.category && (
                        <span className="text-text-secondary font-normal"> · {rp.category}</span>
                      )}
                    </p>
                    <p className="text-[10px] text-text-secondary">
                      {RECURRENCE_LABELS[rp.frequency]} · {fmt(rp.amount)}
                    </p>
                  </div>

                  {paid ? (
                    <span className="text-xs font-medium text-accent-green flex items-center gap-1 flex-shrink-0">
                      <span className="w-4 h-4 rounded-full bg-accent-green/20 flex items-center justify-center text-[10px]">✓</span>
                      Pagado
                    </span>
                  ) : (
                    <button
                      onClick={() => onRegisterPayment(rp)}
                      className="flex-shrink-0 text-xs font-medium text-accent-blue hover:text-blue-400 px-2.5 py-1 rounded-lg bg-accent-blue/10 hover:bg-accent-blue/20 transition-all"
                    >
                      + Registrar
                    </button>
                  )}

                  <button
                    onClick={() => onToggleRecurring(rp.id, false)}
                    className="flex-shrink-0 p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all"
                    title="Pausar recurrente"
                  >
                    <ToggleRight size={13} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Eliminar el pago recurrente "${rp.description || rp.category}"?`)) {
                        onDeleteRecurring(rp.id);
                      }
                    }}
                    className="flex-shrink-0 p-1 rounded-lg text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-all"
                    title="Eliminar"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Inactive section */}
          {inactive.length > 0 && (
            <div className="border-t border-border-color/60">
              <button
                onClick={() => setShowInactive(s => !s)}
                className="w-full px-4 py-2 text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
              >
                <ToggleLeft size={12} />
                {showInactive ? 'Ocultar' : 'Ver'} pausados ({inactive.length})
              </button>
              {showInactive && (
                <div className="divide-y divide-border-color/40">
                  {inactive.map(rp => {
                    const icon = categoryIcons[rp.category] ?? '💳';
                    return (
                      <div key={rp.id} className="flex items-center gap-3 px-4 py-2 opacity-50">
                        <span className="text-base w-6 text-center flex-shrink-0">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-text-secondary truncate">
                            {rp.description || rp.category}
                          </p>
                          <p className="text-[10px] text-text-secondary">{RECURRENCE_LABELS[rp.frequency]}</p>
                        </div>
                        <button
                          onClick={() => onToggleRecurring(rp.id, true)}
                          className="flex-shrink-0 text-xs text-text-secondary hover:text-accent-green px-2 py-1 rounded-lg hover:bg-accent-green/10 transition-all"
                        >
                          Reactivar
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Eliminar el pago recurrente "${rp.description || rp.category}"?`)) {
                              onDeleteRecurring(rp.id);
                            }
                          }}
                          className="flex-shrink-0 p-1 rounded-lg text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
