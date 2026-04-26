import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Calendar,
  DollarSign,
  User,
} from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { useDebts, DebtWithPayments } from '../../hooks/useDebts';
import { Debt, NewDebt, NewDebtPayment } from '../../types';

type TabFilter = 'all' | 'i_owe' | 'they_owe' | 'completed';

// ── Debt Form Modal ──────────────────────────────────────────────────────────

interface DebtFormProps {
  initial?: Debt;
  onSave: (debt: NewDebt | Debt) => Promise<void>;
  onClose: () => void;
}

const DebtForm: React.FC<DebtFormProps> = ({ initial, onSave, onClose }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>(initial?.currency ?? 'ARS');
  const [direction, setDirection] = useState<'i_owe' | 'they_owe'>(initial?.direction ?? 'i_owe');
  const [dueDate, setDueDate] = useState(initial?.due_date ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErr('El nombre es requerido'); return; }
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) { setErr('El monto debe ser mayor a 0'); return; }

    setSaving(true);
    try {
      if (initial) {
        await onSave({
          ...initial,
          name: name.trim(),
          description: description.trim() || null,
          amount: parsedAmount,
          currency,
          direction,
          due_date: dueDate || null,
        });
      } else {
        await onSave({
          name: name.trim(),
          description: description.trim() || null,
          amount: parsedAmount,
          currency,
          direction,
          due_date: dueDate || null,
        });
      }
      onClose();
    } catch {
      setErr('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-bg-card border border-border-color rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-color">
          <h2 className="text-sm font-semibold text-text-primary">
            {initial ? 'Editar deuda' : 'Nueva deuda'}
          </h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Direction toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection('i_owe')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                direction === 'i_owe'
                  ? 'bg-accent-red/15 border-accent-red/40 text-accent-red'
                  : 'border-border-color text-text-secondary hover:border-accent-red/30 hover:text-text-primary'
              }`}
            >
              <ArrowUpRight size={13} />
              Yo debo
            </button>
            <button
              type="button"
              onClick={() => setDirection('they_owe')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                direction === 'they_owe'
                  ? 'bg-accent-green/15 border-accent-green/40 text-accent-green'
                  : 'border-border-color text-text-secondary hover:border-accent-green/30 hover:text-text-primary'
              }`}
            >
              <ArrowDownLeft size={13} />
              Me deben
            </button>
          </div>

          {/* Name */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">
              Persona / Entidad
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Juan Pérez, Banco XYZ"
              className="w-full bg-bg-secondary border border-border-color rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-accent-blue/50"
            />
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">
                Monto total
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-bg-secondary border border-border-color rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-accent-blue/50"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">
                Moneda
              </label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as 'ARS' | 'USD')}
                className="w-full bg-bg-secondary border border-border-color rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue/50"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">
              Descripción (opcional)
            </label>
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Motivo o detalle"
              className="w-full bg-bg-secondary border border-border-color rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-accent-blue/50"
            />
          </div>

          {/* Due date */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">
              Fecha límite (opcional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full bg-bg-secondary border border-border-color rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue/50"
            />
          </div>

          {err && (
            <p className="text-xs text-accent-red flex items-center gap-1">
              <AlertCircle size={12} /> {err}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-border-color text-sm text-text-secondary hover:text-text-primary hover:border-text-secondary/30 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-accent-blue text-white text-sm font-medium hover:bg-accent-blue/90 transition-all disabled:opacity-60"
            >
              {saving ? 'Guardando...' : initial ? 'Guardar' : 'Crear deuda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Payment Form Modal ───────────────────────────────────────────────────────

interface PaymentFormProps {
  debtId: string;
  maxAmount: number;
  currency: 'ARS' | 'USD';
  onSave: (payment: NewDebtPayment) => Promise<void>;
  onClose: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ debtId, maxAmount, currency, onSave, onClose }) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) { setErr('El monto debe ser mayor a 0'); return; }
    if (!date) { setErr('La fecha es requerida'); return; }

    setSaving(true);
    try {
      await onSave({ debt_id: debtId, amount: parsedAmount, date, notes: notes.trim() || null });
      onClose();
    } catch {
      setErr('Error al registrar el pago');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-bg-card border border-border-color rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-color">
          <h2 className="text-sm font-semibold text-text-primary">Registrar pago</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">
                Monto ({currency})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={`Máx. ${maxAmount.toLocaleString('es-AR')}`}
                className="w-full bg-bg-secondary border border-border-color rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-accent-blue/50"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">
                Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-bg-secondary border border-border-color rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1.5">
              Nota (opcional)
            </label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: cuota 1/3, efectivo..."
              className="w-full bg-bg-secondary border border-border-color rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-accent-blue/50"
            />
          </div>

          {err && (
            <p className="text-xs text-accent-red flex items-center gap-1">
              <AlertCircle size={12} /> {err}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-border-color text-sm text-text-secondary hover:text-text-primary transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-accent-green text-white text-sm font-medium hover:bg-accent-green/90 transition-all disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Debt Card ────────────────────────────────────────────────────────────────

interface DebtCardProps {
  debt: DebtWithPayments;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddPayment: () => void;
  onDeletePayment: (paymentId: string) => void;
  onToggleStatus: () => void;
}

const DebtCard: React.FC<DebtCardProps> = ({
  debt,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onAddPayment,
  onDeletePayment,
  onToggleStatus,
}) => {
  const progress = debt.amount > 0 ? Math.min(100, (debt.paid_amount / debt.amount) * 100) : 0;
  const isOverdue = debt.due_date && debt.status === 'active' && isPast(parseISO(debt.due_date));
  const isCompleted = debt.status === 'completed';

  const fmt = (n: number) => {
    if (debt.currency === 'USD') {
      return `US$ ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$ ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      isCompleted
        ? 'border-border-color/40 opacity-70'
        : isOverdue
        ? 'border-accent-red/30 bg-accent-red/[0.03]'
        : 'border-border-color bg-bg-card'
    }`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Direction icon */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          debt.direction === 'i_owe'
            ? 'bg-accent-red/15 text-accent-red'
            : 'bg-accent-green/15 text-accent-green'
        }`}>
          {debt.direction === 'i_owe'
            ? <ArrowUpRight size={14} />
            : <ArrowDownLeft size={14} />}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-text-primary truncate">{debt.name}</span>
            {isCompleted && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-green/15 text-accent-green font-medium">
                Saldada
              </span>
            )}
            {isOverdue && !isCompleted && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-red/15 text-accent-red font-medium flex items-center gap-0.5">
                <AlertCircle size={9} /> Vencida
              </span>
            )}
          </div>
          {debt.description && (
            <p className="text-[11px] text-text-secondary truncate mt-0.5">{debt.description}</p>
          )}
        </div>

        {/* Amounts */}
        <div className="text-right flex-shrink-0">
          <p className={`text-sm font-bold tabular-nums ${
            isCompleted ? 'text-text-secondary line-through' : 'text-text-primary'
          }`}>
            {fmt(debt.amount)}
          </p>
          {!isCompleted && debt.paid_amount > 0 && (
            <p className="text-[11px] text-text-secondary tabular-nums">
              Resta {fmt(debt.remaining_amount)}
            </p>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={onToggle}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Progress bar */}
      {!isCompleted && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress >= 100
                    ? 'bg-accent-green'
                    : progress >= 50
                    ? 'bg-accent-blue'
                    : 'bg-accent-orange'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-text-secondary tabular-nums w-8 text-right">
              {Math.round(progress)}%
            </span>
          </div>

          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-text-secondary">
              Pagado: {fmt(debt.paid_amount)}
            </span>
            {debt.due_date && (
              <span className={`text-[10px] flex items-center gap-0.5 ${
                isOverdue ? 'text-accent-red' : 'text-text-secondary'
              }`}>
                <Calendar size={9} />
                {format(parseISO(debt.due_date), 'd MMM yyyy', { locale: es })}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border-color/60 bg-bg-secondary/40">
          {/* Actions */}
          <div className="flex items-center gap-1.5 px-4 py-2.5">
            {!isCompleted && (
              <button
                onClick={onAddPayment}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-green/15 text-accent-green text-xs font-medium hover:bg-accent-green/25 transition-all"
              >
                <Plus size={11} /> Agregar pago
              </button>
            )}
            <button
              onClick={onToggleStatus}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isCompleted
                  ? 'bg-bg-card text-text-secondary hover:text-text-primary border border-border-color'
                  : 'bg-accent-blue/15 text-accent-blue hover:bg-accent-blue/25'
              }`}
            >
              <Check size={11} />
              {isCompleted ? 'Reabrir' : 'Marcar saldada'}
            </button>
            <div className="flex-1" />
            <button
              onClick={onEdit}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:text-accent-blue hover:bg-accent-blue/10 transition-all"
              title="Editar"
            >
              <Edit2 size={12} />
            </button>
            <button
              onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-all"
              title="Eliminar"
            >
              <Trash2 size={12} />
            </button>
          </div>

          {/* Payments list */}
          <div className="px-4 pb-3">
            {debt.payments.length === 0 ? (
              <p className="text-xs text-text-secondary py-2 text-center">Sin pagos registrados</p>
            ) : (
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-text-secondary mb-2">
                  Pagos ({debt.payments.length})
                </p>
                {debt.payments.map(payment => (
                  <div
                    key={payment.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg-card border border-border-color/50"
                  >
                    <div className="w-6 h-6 rounded-md bg-accent-green/15 flex items-center justify-center flex-shrink-0">
                      <CreditCard size={11} className="text-accent-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary tabular-nums">
                        {debt.currency === 'USD'
                          ? `US$ ${payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                          : `$ ${payment.amount.toLocaleString('es-AR')}`}
                      </p>
                      {payment.notes && (
                        <p className="text-[10px] text-text-secondary truncate">{payment.notes}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-text-secondary flex-shrink-0">
                      {format(parseISO(payment.date), 'd MMM', { locale: es })}
                    </span>
                    <button
                      onClick={() => onDeletePayment(payment.id)}
                      className="w-5 h-5 flex items-center justify-center rounded text-text-secondary/40 hover:text-accent-red hover:bg-accent-red/10 transition-all flex-shrink-0"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main View ────────────────────────────────────────────────────────────────

export const DebtsView: React.FC = () => {
  const { debts, loading, error, addDebt, editDebt, removeDebt, addPayment, removePayment } = useDebts();
  const [tab, setTab] = useState<TabFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | undefined>(undefined);
  const [paymentTarget, setPaymentTarget] = useState<DebtWithPayments | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    switch (tab) {
      case 'i_owe': return debts.filter(d => d.direction === 'i_owe' && d.status === 'active');
      case 'they_owe': return debts.filter(d => d.direction === 'they_owe' && d.status === 'active');
      case 'completed': return debts.filter(d => d.status === 'completed');
      default: return debts.filter(d => d.status === 'active');
    }
  }, [debts, tab]);

  const summary = useMemo(() => {
    const active = debts.filter(d => d.status === 'active');
    const iOwe = active.filter(d => d.direction === 'i_owe');
    const theyOwe = active.filter(d => d.direction === 'they_owe');
    const fmtARS = (n: number) => `$ ${n.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;

    const iOweARS = iOwe.filter(d => d.currency === 'ARS').reduce((s, d) => s + d.remaining_amount, 0);
    const iOweUSD = iOwe.filter(d => d.currency === 'USD').reduce((s, d) => s + d.remaining_amount, 0);
    const theyOweARS = theyOwe.filter(d => d.currency === 'ARS').reduce((s, d) => s + d.remaining_amount, 0);
    const theyOweUSD = theyOwe.filter(d => d.currency === 'USD').reduce((s, d) => s + d.remaining_amount, 0);

    return { iOweARS, iOweUSD, theyOweARS, theyOweUSD, iOweCount: iOwe.length, theyOweCount: theyOwe.length };
  }, [debts]);

  const handleSaveDebt = async (debt: NewDebt | Debt) => {
    if ('id' in debt) {
      await editDebt(debt as Debt);
    } else {
      await addDebt(debt as NewDebt);
    }
  };

  const handleToggleStatus = async (debt: DebtWithPayments) => {
    await editDebt({ ...debt, status: debt.status === 'active' ? 'completed' : 'active' });
  };

  const tabs: { id: TabFilter; label: string }[] = [
    { id: 'all', label: 'Activas' },
    { id: 'i_owe', label: 'Yo debo' },
    { id: 'they_owe', label: 'Me deben' },
    { id: 'completed', label: 'Saldadas' },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Summary cards */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-3 mb-4">
        {/* I owe */}
        <div className="bg-bg-card border border-border-color rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-accent-red/15 flex items-center justify-center">
              <ArrowUpRight size={13} className="text-accent-red" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
              Yo debo
            </p>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-bg-secondary text-text-secondary border border-border-color">
              {summary.iOweCount}
            </span>
          </div>
          <div className="space-y-0.5">
            {summary.iOweARS > 0 && (
              <p className="text-base font-bold tabular-nums text-accent-red">
                $ {summary.iOweARS.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </p>
            )}
            {summary.iOweUSD > 0 && (
              <p className={`tabular-nums font-bold ${summary.iOweARS > 0 ? 'text-sm text-accent-red/80' : 'text-base text-accent-red'}`}>
                US$ {summary.iOweUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
            {summary.iOweARS === 0 && summary.iOweUSD === 0 && (
              <p className="text-base font-bold text-text-secondary">—</p>
            )}
          </div>
        </div>

        {/* They owe me */}
        <div className="bg-bg-card border border-border-color rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-accent-green/15 flex items-center justify-center">
              <ArrowDownLeft size={13} className="text-accent-green" />
            </div>
            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">
              Me deben
            </p>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-bg-secondary text-text-secondary border border-border-color">
              {summary.theyOweCount}
            </span>
          </div>
          <div className="space-y-0.5">
            {summary.theyOweARS > 0 && (
              <p className="text-base font-bold tabular-nums text-accent-green">
                $ {summary.theyOweARS.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              </p>
            )}
            {summary.theyOweUSD > 0 && (
              <p className={`tabular-nums font-bold ${summary.theyOweARS > 0 ? 'text-sm text-accent-green/80' : 'text-base text-accent-green'}`}>
                US$ {summary.theyOweUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
            {summary.theyOweARS === 0 && summary.theyOweUSD === 0 && (
              <p className="text-base font-bold text-text-secondary">—</p>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center gap-2 mb-3">
        {/* Tabs */}
        <div className="flex gap-1 bg-bg-secondary rounded-lg p-1 border border-border-color">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                tab === t.id
                  ? 'bg-bg-card text-text-primary shadow-sm border border-border-color'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button
          onClick={() => { setEditingDebt(undefined); setShowDebtForm(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue text-white text-xs font-medium hover:bg-accent-blue/90 transition-all"
        >
          <Plus size={12} /> Nueva deuda
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl skeleton" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-accent-red">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-12 h-12 rounded-2xl bg-bg-secondary border border-border-color flex items-center justify-center mb-3">
              <User size={20} className="text-text-secondary" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">
              {tab === 'completed' ? 'No hay deudas saldadas' : 'Sin deudas activas'}
            </p>
            <p className="text-xs text-text-secondary">
              {tab === 'all' && 'Registrá una deuda con el botón de arriba'}
              {tab === 'i_owe' && 'No tenés deudas pendientes'}
              {tab === 'they_owe' && 'Nadie te debe plata'}
            </p>
          </div>
        ) : (
          filtered.map(debt => (
            <DebtCard
              key={debt.id}
              debt={debt}
              expanded={expandedId === debt.id}
              onToggle={() => setExpandedId(expandedId === debt.id ? null : debt.id)}
              onEdit={() => { setEditingDebt(debt); setShowDebtForm(true); }}
              onDelete={() => setConfirmDeleteId(debt.id)}
              onAddPayment={() => setPaymentTarget(debt)}
              onDeletePayment={pid => removePayment(pid)}
              onToggleStatus={() => handleToggleStatus(debt)}
            />
          ))
        )}
      </div>

      {/* Debt Form Modal */}
      {showDebtForm && (
        <DebtForm
          initial={editingDebt}
          onSave={handleSaveDebt}
          onClose={() => { setShowDebtForm(false); setEditingDebt(undefined); }}
        />
      )}

      {/* Payment Form Modal */}
      {paymentTarget && (
        <PaymentForm
          debtId={paymentTarget.id}
          maxAmount={paymentTarget.remaining_amount}
          currency={paymentTarget.currency}
          onSave={addPayment}
          onClose={() => setPaymentTarget(null)}
        />
      )}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-bg-card border border-border-color rounded-2xl w-full max-w-sm shadow-2xl p-5 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-accent-red/15 flex items-center justify-center flex-shrink-0">
                <Trash2 size={16} className="text-accent-red" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">Eliminar deuda</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Se eliminarán también todos los pagos asociados. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2 rounded-lg border border-border-color text-sm text-text-secondary hover:text-text-primary transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await removeDebt(confirmDeleteId);
                  if (expandedId === confirmDeleteId) setExpandedId(null);
                  setConfirmDeleteId(null);
                }}
                className="flex-1 py-2 rounded-lg bg-accent-red text-white text-sm font-medium hover:bg-accent-red/90 transition-all"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
