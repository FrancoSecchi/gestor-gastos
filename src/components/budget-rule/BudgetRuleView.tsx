import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Percent, AlertCircle, CheckCircle, RotateCcw,
  Plus, X, Edit2, Trash2, Target, ChevronDown, ChevronUp,
} from 'lucide-react';
import { DatePicker } from '../ui/DatePicker';
import { BudgetRuleWidget } from '../dashboard/BudgetRuleWidget';
import { SavingsGoal, Transaction, Rule502030Group, Rule502030Percentages } from '../../types';
import { Rule502030Mapping, assignmentToMapping, buildAssignmentForCategories } from '../../lib/budgetRuleMapping';
import { DEFAULT_PERCENTAGES } from '../../lib/budgetRule';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import { logError, getReadableError } from '../../lib/db';
import { format, parseISO, differenceInMonths } from 'date-fns';
import { es } from 'date-fns/locale';

interface BudgetRuleViewProps {
  transactions: Transaction[];
  totalIncome: number;
  expenseCategories: string[];
  mapping: Rule502030Mapping | null;
  effectiveMapping: Rule502030Mapping;
  percentages: Rule502030Percentages;
  startDate?: string;
  endDate?: string;
  allTransactions: Transaction[];
  savingsGoals: SavingsGoal[];
  savingsGoalsLoading: boolean;
  rule502030Enabled: boolean;
  onToggleRule502030: (enabled: boolean) => void;
  onCreateGoal: (goal: Omit<SavingsGoal, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateGoal: (goal: SavingsGoal) => Promise<void>;
  onRemoveGoal: (id: string) => Promise<void>;
  onSave: (m: Rule502030Mapping) => Promise<void>;
  onSavePercentages: (p: Rule502030Percentages) => Promise<void>;
  onReset: () => Promise<void>;
}

const GROUP_META: { value: Rule502030Group; icon: string; label: string }[] = [
  { value: 'Necesidades', icon: '🏠', label: 'Necesidades' },
  { value: 'Deseos', icon: '🎮', label: 'Deseos' },
  { value: 'Ahorro/Inversión', icon: '💰', label: 'Ahorro / Inversión' },
];

const EMPTY_FORM = {
  name: '',
  targetAmount: 0,
  currency: 'ARS' as 'ARS' | 'USD',
  targetDate: '',
};

function getGoalProgress(goal: SavingsGoal, allTx: Transaction[]) {
  const saved = allTx.reduce((sum, tx) => {
    if (tx.goal_id !== goal.id) return sum;
    return sum + (goal.currency === 'USD' ? (tx.amount_usd ?? 0) : tx.amount);
  }, 0);

  const remaining = Math.max(0, goal.targetAmount - saved);
  const percentage = goal.targetAmount > 0 ? Math.min(100, (saved / goal.targetAmount) * 100) : 0;

  const targetDate = parseISO(goal.targetDate);
  const now = new Date();
  const monthsLeft = Math.max(0, differenceInMonths(targetDate, now));
  const monthlyNeeded = monthsLeft > 0 ? remaining / monthsLeft : remaining;
  const isCompleted = percentage >= 100;
  const isPastDue = targetDate < now && !isCompleted;

  return { saved, remaining, percentage, monthsLeft, monthlyNeeded, isCompleted, isPastDue };
}

function formatGoalAmount(amount: number, currency: 'ARS' | 'USD', fmtLocal: (n: number) => string): string {
  return currency === 'USD'
    ? `U$S ${amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : fmtLocal(amount);
}

export const BudgetRuleView = React.memo((props: BudgetRuleViewProps) => {
  const {
    transactions,
    totalIncome,
    expenseCategories,
    mapping,
    effectiveMapping,
    percentages,
    startDate,
    endDate,
    allTransactions,
    savingsGoals,
    savingsGoalsLoading,
    rule502030Enabled,
    onToggleRule502030,
    onCreateGoal,
    onUpdateGoal,
    onRemoveGoal,
    onSave,
    onSavePercentages,
    onReset,
  } = props;

  const { fmt } = useCurrencyFormat();
  const [assign, setAssign] = useState<Record<string, Rule502030Group>>({});
  const [localPct, setLocalPct] = useState<Rule502030Percentages>(percentages);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  // Goal modal state
  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [goalEditing, setGoalEditing] = useState<SavingsGoal | null>(null);
  const [goalForm, setGoalForm] = useState(EMPTY_FORM);
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);

  const expenseKey = expenseCategories.join('\0');
  useEffect(() => { setAssign(buildAssignmentForCategories(expenseCategories, mapping)); }, [expenseKey, mapping]);
  useEffect(() => { setLocalPct(percentages); }, [percentages]);

  const pctSum = localPct.Necesidades + localPct.Deseos + localPct['Ahorro/Inversión'];
  const pctValid = pctSum === 100;

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async () => {
    if (!pctValid) return;
    setSaving(true);
    try {
      await Promise.all([onSave(assignmentToMapping(assign)), onSavePercentages(localPct)]);
      showMessage('success', 'Configuración guardada');
    } catch (err) {
      await logError('Rule502030View.handleSave', err);
      showMessage('error', getReadableError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      await Promise.all([onReset(), onSavePercentages(DEFAULT_PERCENTAGES)]);
      setLocalPct(DEFAULT_PERCENTAGES);
      showMessage('success', 'Restaurado al criterio por defecto');
    } catch (err) {
      await logError('Rule502030View.handleReset', err);
      showMessage('error', getReadableError(err));
    } finally {
      setSaving(false);
    }
  };

  const openGoalForm = (goal?: SavingsGoal) => {
    if (goal) {
      setGoalEditing(goal);
      setGoalForm({ name: goal.name, targetAmount: goal.targetAmount, currency: goal.currency, targetDate: goal.targetDate });
    } else {
      setGoalEditing(null);
      setGoalForm(EMPTY_FORM);
    }
    setGoalError(null);
    setGoalFormOpen(true);
  };

  const closeGoalForm = () => {
    setGoalFormOpen(false);
    setGoalEditing(null);
    setGoalForm(EMPTY_FORM);
    setGoalError(null);
  };

  const handleSaveGoal = async () => {
    if (!goalForm.name.trim()) return setGoalError('El nombre es obligatorio');
    if (goalForm.targetAmount <= 0) return setGoalError('El monto debe ser mayor a 0');
    if (!goalForm.targetDate) return setGoalError('La fecha límite es obligatoria');

    setGoalSaving(true);
    setGoalError(null);
    try {
      if (goalEditing) {
        await onUpdateGoal({ ...goalEditing, ...goalForm });
      } else {
        await onCreateGoal(goalForm);
      }
      closeGoalForm();
      showMessage('success', goalEditing ? 'Meta actualizada' : 'Meta creada');
    } catch (err) {
      await logError('Rule502030View.handleSaveGoal', err);
      setGoalError(getReadableError(err));
    } finally {
      setGoalSaving(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!window.confirm('¿Eliminar esta meta?')) return;
    try {
      await onRemoveGoal(goalId);
      showMessage('success', 'Meta eliminada');
    } catch (err) {
      await logError('Rule502030View.handleDeleteGoal', err);
      showMessage('error', getReadableError(err));
    }
  };

  const groupOptions = GROUP_META.map(g => ({
    value: g.value,
    label: `${g.label} (${localPct[g.value]}%)`,
  }));

  return (
    <div className="flex flex-col gap-5 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Metas</h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Controlá tu presupuesto y hacé seguimiento de tus objetivos de ahorro.
          </p>
        </div>
        {message && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border animate-fade-in ${
            message.type === 'success'
              ? 'bg-accent-green/10 border-accent-green/20 text-accent-green'
              : 'bg-accent-red/10 border-accent-red/20 text-accent-red'
          }`}>
            {message.type === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
            {message.text}
          </div>
        )}
      </div>

      {/* ── Regla 50/30/20 ── */}
      <div className="bg-bg-card border border-border-color rounded-xl overflow-hidden">
        {/* Toggle header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">Regla 50/30/20</p>
            <p className="text-xs text-text-secondary mt-0.5">
              Distribuí tus ingresos en necesidades, deseos y ahorro.
            </p>
          </div>
          <button
            onClick={() => onToggleRule502030(!rule502030Enabled)}
            className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${
              rule502030Enabled ? 'bg-accent-blue' : 'bg-border-color'
            }`}
            title={rule502030Enabled ? 'Desactivar' : 'Activar'}
          >
            <span className={`absolute top-0.5 h-4 w-4 bg-white rounded-full shadow-sm transition-all duration-200 ${
              rule502030Enabled ? 'left-4' : 'left-0.5'
            }`} />
          </button>
        </div>

        {rule502030Enabled && (
          <>
            {/* Widget */}
            <div className="border-t border-border-color px-4 pt-3 pb-4">
              <BudgetRuleWidget
                transactions={transactions}
                totalIncome={totalIncome}
                mapping={effectiveMapping}
                percentages={localPct}
                startDate={startDate}
                endDate={endDate}
              />
            </div>

            {/* Collapsible config */}
            <div className="border-t border-border-color">
              <button
                onClick={() => setConfigOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-secondary/50 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Percent size={11} />
                  Configurar distribución y categorías
                </span>
                {configOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>

              {configOpen && (
                <div className="px-4 pb-4 border-t border-border-color/60 pt-4 flex flex-col gap-4">
                  {/* Percentage inputs */}
                  <div className="flex flex-col gap-3">
                    {GROUP_META.map(g => (
                      <div key={g.value} className="flex items-center gap-3">
                        <span className="text-base w-6 text-center">{g.icon}</span>
                        <span className="text-sm text-text-primary w-40">{g.label}</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number" min={0} max={100}
                            value={localPct[g.value]}
                            onChange={e => setLocalPct(prev => ({ ...prev, [g.value]: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) }))}
                            className="w-16 bg-bg-secondary border border-border-color rounded-lg px-2.5 py-1.5 text-sm text-center text-text-primary focus:outline-none focus:border-accent-blue"
                          />
                          <span className="text-sm text-text-secondary">%</span>
                        </div>
                      </div>
                    ))}
                    <div className={`flex items-center gap-2 text-xs font-medium ${pctValid ? 'text-accent-green' : 'text-accent-red'}`}>
                      {pctValid ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                      Total: {pctSum}%
                      {!pctValid && <span className="text-text-secondary font-normal ml-1">— debe sumar 100%</span>}
                    </div>
                  </div>

                  {/* Category assignment */}
                  <div>
                    <p className="text-xs font-medium text-text-secondary mb-2">Agrupación de categorías</p>
                    <div className="max-h-60 overflow-y-auto rounded-lg border border-border-color/60">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-bg-secondary border-b border-border-color">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium text-text-secondary">Categoría</th>
                            <th className="text-left px-3 py-2 font-medium text-text-secondary w-52">Grupo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...expenseCategories].sort((a, b) => a.localeCompare(b, 'es')).map(cat => (
                            <tr key={cat} className="border-t border-border-color/40 hover:bg-bg-secondary/50">
                              <td className="px-3 py-2 text-text-primary">{cat}</td>
                              <td className="px-3 py-2">
                                <select
                                  value={assign[cat] ?? 'Deseos'}
                                  onChange={e => setAssign(prev => ({ ...prev, [cat]: e.target.value as Rule502030Group }))}
                                  className="w-full bg-bg-secondary border border-border-color rounded-md px-2 py-1 text-text-primary focus:outline-none focus:border-accent-blue"
                                >
                                  {groupOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handleReset}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border-color text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
                    >
                      <RotateCcw size={11} />
                      Valores por defecto
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || !pctValid}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-blue text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Guardando…' : 'Guardar configuración'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Mis Metas ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Mis Metas</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Cada transacción de ahorro se puede asociar a una meta.
            </p>
          </div>
          <button
            onClick={() => openGoalForm()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-blue text-white hover:bg-blue-500 transition-colors"
          >
            <Plus size={13} />
            Nueva meta
          </button>
        </div>

        {savingsGoalsLoading ? (
          <div className="bg-bg-card border border-border-color rounded-xl p-8 flex items-center justify-center">
            <p className="text-xs text-text-secondary">Cargando metas…</p>
          </div>
        ) : savingsGoals.length === 0 ? (
          <div className="bg-bg-card border border-dashed border-border-color rounded-xl p-8 flex flex-col items-center gap-3 text-center">
            <Target size={28} className="text-text-secondary/30" />
            <div>
              <p className="text-sm font-medium text-text-secondary">Sin metas todavía</p>
              <p className="text-xs text-text-secondary/70 mt-0.5">
                Creá tu primera meta y asociá ahorros para hacer seguimiento del progreso.
              </p>
            </div>
            <button
              onClick={() => openGoalForm()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border-color text-text-secondary hover:text-text-primary hover:border-accent-blue/40 transition-colors"
            >
              <Plus size={12} />
              Crear primera meta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {savingsGoals.map(goal => {
              const p = getGoalProgress(goal, allTransactions);
              return (
                <div key={goal.id} className="bg-bg-card border border-border-color rounded-xl p-4 flex flex-col gap-3">
                  {/* Goal header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                        <Target size={15} className="text-accent-blue" />
                      </div>
                      <p className="text-sm font-semibold text-text-primary truncate">{goal.name}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openGoalForm(goal)}
                        className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1.5 rounded-md text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Status badge */}
                  {p.isCompleted && (
                    <span className="self-start text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent-green/15 text-accent-green border border-accent-green/20">
                      ✓ Completada
                    </span>
                  )}
                  {p.isPastDue && !p.isCompleted && (
                    <span className="self-start text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent-orange/15 text-accent-orange border border-accent-orange/20">
                      Vencida
                    </span>
                  )}

                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-text-secondary tabular-nums">
                        {formatGoalAmount(p.saved, goal.currency, fmt)}
                      </span>
                      <span className="text-xs font-semibold text-text-primary tabular-nums">
                        {p.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${p.percentage}%`,
                          backgroundColor: p.isCompleted ? '#22c55e' : p.isPastDue ? '#f97316' : '#3b82f6',
                        }}
                      />
                    </div>
                    <p className="text-xs text-text-secondary mt-1 tabular-nums">
                      de {formatGoalAmount(goal.targetAmount, goal.currency, fmt)}
                    </p>
                  </div>

                  {/* Time + monthly info */}
                  {!p.isCompleted && (
                    <div className="border-t border-border-color/60 pt-2.5 flex flex-col gap-1">
                      <p className="text-xs text-text-secondary">
                        {p.isPastDue
                          ? `Venció el ${format(parseISO(goal.targetDate), "d 'de' MMMM 'de' yyyy", { locale: es })}`
                          : p.monthsLeft === 0
                          ? 'Vence este mes'
                          : `${p.monthsLeft} ${p.monthsLeft === 1 ? 'mes' : 'meses'} restantes · vence ${format(parseISO(goal.targetDate), "MMM yyyy", { locale: es })}`
                        }
                      </p>
                      {!p.isPastDue && p.monthsLeft > 0 && (
                        <p className="text-xs text-text-secondary">
                          Necesitás{' '}
                          <span className="font-semibold text-text-primary">
                            {formatGoalAmount(Math.ceil(p.monthlyNeeded), goal.currency, fmt)}/mes
                          </span>
                          {' '}para llegar
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Goal modal ── */}
      {goalFormOpen && createPortal(
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={closeGoalForm} />
          <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-bg-secondary border border-border-color rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {goalEditing ? 'Editar meta' : 'Nueva meta'}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Definí el objetivo y la fecha límite.
                </p>
              </div>
              <button
                onClick={closeGoalForm}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-text-secondary block mb-1.5">
                  Nombre
                </label>
                <input
                  autoFocus
                  value={goalForm.name}
                  onChange={e => setGoalForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej. Viaje a Lisboa"
                  className="w-full bg-bg-card border border-border-color rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-blue"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-text-secondary block mb-1.5">
                    Monto objetivo
                  </label>
                  <input
                    type="number" min="0"
                    value={goalForm.targetAmount || ''}
                    onChange={e => setGoalForm(prev => ({ ...prev, targetAmount: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full bg-bg-card border border-border-color rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium uppercase tracking-wider text-text-secondary block mb-1.5">
                    Moneda
                  </label>
                  <select
                    value={goalForm.currency}
                    onChange={e => setGoalForm(prev => ({ ...prev, currency: e.target.value as 'ARS' | 'USD' }))}
                    className="w-full bg-bg-card border border-border-color rounded-xl px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-blue"
                  >
                    <option value="ARS">ARS (pesos)</option>
                    <option value="USD">USD (dólares)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-medium uppercase tracking-wider text-text-secondary block mb-1.5">
                  Fecha límite
                </label>
                <DatePicker
                  value={goalForm.targetDate}
                  onChange={val => setGoalForm(prev => ({ ...prev, targetDate: val }))}
                  className="w-full bg-bg-card border border-border-color rounded-xl px-3 py-2.5 text-sm"
                />
              </div>

              {goalError && (
                <p className="text-xs text-accent-red flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  {goalError}
                </p>
              )}

              <button
                onClick={handleSaveGoal}
                disabled={goalSaving}
                className="w-full py-2.5 rounded-xl bg-accent-blue text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {goalSaving ? 'Guardando…' : goalEditing ? 'Guardar cambios' : 'Crear meta'}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
});
