import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Save, Plus, Eye, Calendar, Paperclip, FileX, RefreshCw } from 'lucide-react';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { copyReceiptFile, deleteReceiptFile } from '../../lib/receiptUtils';
import { DatePicker } from '../ui/DatePicker';
import { Transaction, NewTransaction, TransactionType, DollarRate, getCategoryColor, RecurrenceFrequency, RECURRENCE_LABELS, RecurringPayment } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatARS } from '../../lib/export';
import { HousingContract, getAmountForDate } from '../../lib/housingContract';

const SAVINGS_CATEGORIES = ['Ahorro', 'Inversión'];

interface TransactionFormProps {
  transaction?: Transaction | null;
  initialType?: 'income' | 'expense';
  /** Pre-fill form from a recurring payment template (for "Registrar pago" flow) */
  recurringTemplate?: { id: string; type: TransactionType; amount: number; category: string; subcategory?: string | null; description?: string | null } | null;
  recurringPayments?: RecurringPayment[];
  expenseCategories: string[];
  incomeCategories: string[];
  categoryIcons: Record<string, string>;
  housingContract?: HousingContract | null;
  dollarRates?: DollarRate[];
  onAddCustomCategory: (type: TransactionType, name: string) => Promise<void>;
  onSave: (tx: NewTransaction | Transaction, recurringFrequency?: RecurrenceFrequency) => Promise<void>;
  onClose: () => void;
}


const defaultForm: NewTransaction = {
  type: 'expense',
  amount: 0,
  amount_usd: null,
  dollar_type: null,
  category: 'Comida',
  subcategory: null,
  description: '',
  date: format(new Date(), 'yyyy-MM-dd'),
};

function formatAmountDisplay(value: number): string {
  if (!value) return '';
  return formatARS(value);
}

export const TransactionForm = React.memo((props: TransactionFormProps) => {
  const {
    transaction,
    initialType,
    recurringTemplate,
    recurringPayments = [],
    expenseCategories,
    incomeCategories,
    categoryIcons,
    housingContract,
    dollarRates = [],
    onAddCustomCategory,
    onSave,
    onClose,
  } = props;
  const [form, setForm] = useState<NewTransaction>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formMode, setFormMode] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [transferMode, setTransferMode] = useState<'deposit' | 'withdraw'>('deposit');
  // Receipt state
  const [pendingFilePath, setPendingFilePath] = useState<string | null>(null); // ruta local seleccionada
  const [removeReceipt, setRemoveReceipt] = useState(false); // si el usuario quiere quitar el comprobante existente
  // Recurring state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurrenceFrequency>('monthly');
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (transaction) {
      setForm({
        type: transaction.type,
        subtype: transaction.subtype,
        amount: transaction.amount,
        amount_usd: transaction.amount_usd ?? null,
        dollar_type: transaction.dollar_type ?? null,
        category: transaction.category,
        subcategory: transaction.subcategory ?? null,
        description: transaction.description ?? '',
        date: transaction.date,
        recurring_id: transaction.recurring_id ?? null,
      });
      setAmountInput(transaction.amount > 0 ? String(transaction.amount) : '');

      // Determinar formMode si es una transacción de ahorro
      if (transaction.subtype === 'transfer_to_savings') {
        setFormMode('transfer');
        setTransferMode('deposit');
      } else if (transaction.subtype === 'transfer_from_savings') {
        setFormMode('transfer');
        setTransferMode('withdraw');
      } else if (transaction.type === 'expense') {
        setFormMode('expense');
      } else {
        setFormMode('income');
      }
      // Si la transacción ya está linkeada a un recurrente, mostrarlo activado
      if (transaction.recurring_id) {
        setIsRecurring(true);
        const linked = recurringPayments.find(r => r.id === transaction.recurring_id);
        if (linked) setRecurringFrequency(linked.frequency);
      } else {
        setIsRecurring(false);
      }
    } else if (recurringTemplate) {
      // Pre-fill from recurring template (registrar pago)
      setForm({
        ...defaultForm,
        type: recurringTemplate.type,
        amount: recurringTemplate.amount,
        category: recurringTemplate.category,
        subcategory: recurringTemplate.subcategory ?? null,
        description: recurringTemplate.description ?? '',
        recurring_id: recurringTemplate.id,
      });
      setAmountInput(recurringTemplate.amount > 0 ? String(recurringTemplate.amount) : '');
      setFormMode(recurringTemplate.type === 'income' ? 'income' : 'expense');
      setIsRecurring(false);
    } else {
      setForm({ ...defaultForm, type: initialType ?? 'expense' });
      setAmountInput('');
      setFormMode(initialType ?? 'expense');
      setTransferMode('deposit');
      setIsRecurring(false);
    }
    setPendingFilePath(null);
    setRemoveReceipt(false);
  }, [transaction, recurringTemplate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  const categories = useMemo(() => {
    let base = form.type === 'expense' ? expenseCategories : incomeCategories;
    // Filtrar categorías de ahorro cuando es un gasto
    if (form.type === 'expense') {
      base = base.filter(cat => !SAVINGS_CATEGORIES.includes(cat));
    }
    if (form.category && !base.includes(form.category)) {
      return [form.category, ...base];
    }
    return base;
  }, [form.type, form.category, expenseCategories, incomeCategories]);

  const handleTypeChange = (type: TransactionType) => {
    const list = type === 'expense' ? expenseCategories : incomeCategories;
    const defaultCat = list[0] ?? (type === 'expense' ? 'Comida' : 'Salario');
    setForm(prev => ({ ...prev, type, category: defaultCat, subtype: undefined }));
    setFormMode(type === 'expense' ? 'expense' : 'income');
  };

  const handleFormModeChange = (mode: 'expense' | 'income' | 'transfer') => {
    setFormMode(mode);
    
    if (mode === 'expense') {
      const list = expenseCategories;
      const defaultCat = list[0] ?? 'Comida';
      setForm(prev => ({ ...prev, type: 'expense', category: defaultCat, subtype: undefined }));
    } else if (mode === 'income') {
      const list = incomeCategories;
      const defaultCat = list[0] ?? 'Salario';
      setForm(prev => ({ ...prev, type: 'income', category: defaultCat, subtype: undefined }));
    } else if (mode === 'transfer') {
      // El subtype se asignará según transferMode
      const subtype = transferMode === 'deposit' ? 'transfer_to_savings' : 'transfer_from_savings';
      if (transferMode === 'deposit') {
        setForm(prev => ({ ...prev, type: 'expense', subtype, category: 'Ahorro' }));
      } else {
        setForm(prev => ({ ...prev, type: 'income', subtype, category: 'Retiro de ahorro' }));
      }
    }
  };

  const handleTransferModeChange = (mode: 'deposit' | 'withdraw') => {
    setTransferMode(mode);
    
    if (mode === 'deposit') {
      setForm(prev => ({
        ...prev,
        type: 'expense',
        subtype: 'transfer_to_savings',
        category: 'Ahorro',
      }));
    } else {
      setForm(prev => ({
        ...prev,
        type: 'income',
        subtype: 'transfer_from_savings',
        category: 'Retiro de ahorro',
      }));
    }
  };

  const handleAddCustomCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      setError('Escribí un nombre para la categoría');
      return;
    }
    setError(null);
    setAddingCategory(true);
    try {
      await onAddCustomCategory(form.type, name);
      setForm(prev => ({ ...prev, category: name }));
      setNewCategoryName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar la categoría');
    } finally {
      setAddingCategory(false);
    }
  };

  const handleAmountChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    setAmountInput(cleaned);
    const parsed = parseFloat(cleaned) || 0;
    setForm(prev => {
      const next = { ...prev, amount: parsed };
      // Auto-recalculate USD if dollar type is selected
      if (prev.dollar_type) {
        const rate = dollarRates.find(r => r.casa === prev.dollar_type);
        if (rate && rate.venta > 0) {
          next.amount_usd = parseFloat((parsed / rate.venta).toFixed(2));
        }
      }
      return next;
    });
  };

  const handleDollarTypeChange = (casa: string | null) => {
    setForm(prev => {
      const next = { ...prev, dollar_type: casa };
      if (casa) {
        const rate = dollarRates.find(r => r.casa === casa);
        if (rate && rate.venta > 0 && prev.amount > 0) {
          next.amount_usd = parseFloat((prev.amount / rate.venta).toFixed(2));
        }
      } else {
        next.amount_usd = null;
      }
      return next;
    });
  };

  const handlePickFile = async () => {
    const selected = await openDialog({
      multiple: false,
      filters: [{ name: 'Comprobante', extensions: ['pdf', 'png', 'jpg', 'jpeg'] }],
    });
    if (selected && typeof selected === 'string') {
      setPendingFilePath(selected);
      setRemoveReceipt(false);
    }
  };

  const handleRemoveReceipt = () => {
    setPendingFilePath(null);
    setRemoveReceipt(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.amount || form.amount <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }
    if (!form.date) {
      setError('La fecha es requerida');
      return;
    }

    setLoading(true);
    try {
      let receiptPath: string | null = transaction?.receipt_path ?? null;

      if (removeReceipt) {
        if (receiptPath) await deleteReceiptFile(receiptPath);
        receiptPath = null;
      } else if (pendingFilePath) {
        if (receiptPath) await deleteReceiptFile(receiptPath);
        receiptPath = await copyReceiptFile(pendingFilePath, form.category, form.date);
      }

      const payload = { ...form, receipt_path: receiptPath };
      if (transaction) {
        let finalPayload = { ...transaction, ...payload };
        // Si se activó recurrente en edición y no estaba linkeado, pasar frecuencia para crear el recurrente
        const needsNewRecurring = isRecurring && !finalPayload.recurring_id;
        // Si se desactivó recurrente en edición y estaba linkeado, deslinkar
        if (!isRecurring && finalPayload.recurring_id) {
          finalPayload = { ...finalPayload, recurring_id: null };
        }
        await onSave(finalPayload, needsNewRecurring ? recurringFrequency : undefined);
      } else {
        // Si se marcó como recurrente en creación y no viene con recurring_id ya seteado
        const freq = isRecurring && !payload.recurring_id ? recurringFrequency : undefined;
        await onSave(payload, freq);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `
    w-full bg-bg-secondary border border-border-color rounded-xl px-3 py-2.5 text-sm text-text-primary
    focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20
    placeholder-text-secondary transition-all duration-150
  `;

  const dateFormatted = form.date
    ? format(new Date(form.date + 'T12:00:00'), "d 'de' MMMM, yyyy", { locale: es })
    : '';

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdrop}
    >
      <div
        className={`
          bg-bg-card border border-border-color rounded-2xl w-full max-w-4xl shadow-2xl
          transition-all duration-300 flex flex-col max-h-[90vh] overflow-hidden
          ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}
        `}
      >
        {/* Header */}
        <div className={`
          flex items-center justify-between px-5 py-4 border-b border-border-color flex-shrink-0
          ${formMode === 'income'
            ? 'bg-gradient-to-r from-accent-green/5 to-transparent'
            : formMode === 'transfer'
            ? 'bg-gradient-to-r from-accent-blue/5 to-transparent'
            : 'bg-gradient-to-r from-accent-red/5 to-transparent'
          }
        `}>
          <div className="flex items-center gap-3">
            <div className={`
              w-8 h-8 rounded-xl flex items-center justify-center text-base
              ${formMode === 'income' ? 'bg-accent-green/15' : formMode === 'transfer' ? 'bg-accent-blue/15' : 'bg-accent-red/15'}
            `}>
              {formMode === 'transfer' ? '↕' : categoryIcons[form.category] ?? '💳'}
            </div>
            <h2 className="text-base font-semibold text-text-primary">
              {transaction ? 'Editar Transacción' : 'Nueva Transacción'}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowPreview(p => !p)}
              className={`p-1.5 rounded-lg text-text-secondary hover:text-accent-blue hover:bg-accent-blue/10 transition-all duration-150 ${showPreview ? 'text-accent-blue bg-accent-blue/10' : ''}`}
              title="Vista previa"
            >
              <Eye size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all duration-150"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div className="px-5 pt-3 pb-0 animate-fade-in flex-shrink-0">
            <div className={`
              flex items-center gap-3 p-3 rounded-xl border
              ${formMode === 'income'
                ? 'bg-accent-green/8 border-accent-green/20'
                : formMode === 'transfer'
                ? 'bg-accent-blue/8 border-accent-blue/20'
                : 'bg-accent-red/8 border-accent-red/20'
              }
            `}>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={formMode === 'transfer' ? { backgroundColor: '#3b82f626' } : { backgroundColor: `${getCategoryColor(form.category)}25` }}
              >
                {formMode === 'transfer' ? '↕' : (categoryIcons[form.category] ?? '💳')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-primary truncate">
                  {formMode === 'transfer'
                    ? (transferMode === 'deposit' ? '→ Depositar a ahorros' : '← Retirar de ahorros')
                    : form.category
                  }
                  {form.description ? ` · ${form.description}` : ''}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {dateFormatted || 'Sin fecha'}
                </p>
              </div>
              <span className={`text-base font-bold tabular-nums flex-shrink-0 ${
                formMode === 'income' ? 'text-accent-green' : formMode === 'transfer' ? 'text-accent-blue' : 'text-accent-red'
              }`}>
                {formMode === 'income' ? '+' : formMode === 'transfer' ? (transferMode === 'deposit' ? '→' : '←') : '-'}${formatAmountDisplay(form.amount)}
              </span>
            </div>
          </div>
        )}

        {/* Content: two columns layout */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* LEFT COLUMN: form fields */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 lg:border-r lg:border-border-color">
            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">Tipo</label>
              <div className="grid grid-cols-3 gap-2">
                {(['expense', 'income', 'transfer'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleFormModeChange(mode)}
                    className={`
                      py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                      ${formMode === mode
                        ? mode === 'expense'
                          ? 'bg-accent-red/20 text-accent-red border border-accent-red/40 shadow-sm shadow-accent-red/10'
                          : mode === 'income'
                          ? 'bg-accent-green/20 text-accent-green border border-accent-green/40 shadow-sm shadow-accent-green/10'
                          : 'bg-accent-blue/20 text-accent-blue border border-accent-blue/40 shadow-sm shadow-accent-blue/10'
                        : 'bg-bg-secondary text-text-secondary border border-border-color hover:border-text-secondary/50'
                      }
                    `}
                  >
                    {mode === 'expense' ? '↓ Gasto' : mode === 'income' ? '↑ Ingreso' : '↕ Ahorro'}
                  </button>
                ))}
              </div>

              {/* Sub-toggle for transfer mode */}
              {formMode === 'transfer' && (
                <div className="mt-3 grid grid-cols-2 gap-2 p-3 bg-accent-blue/8 border border-accent-blue/20 rounded-xl animate-fade-in">
                  <button
                    type="button"
                    onClick={() => handleTransferModeChange('deposit')}
                    className={`
                      py-2 rounded-lg text-xs font-semibold transition-all duration-200
                      ${transferMode === 'deposit'
                        ? 'bg-accent-blue text-white shadow-sm shadow-accent-blue/20'
                        : 'bg-bg-secondary text-text-secondary border border-border-color hover:border-accent-blue/30 hover:text-text-primary'
                      }
                    `}
                  >
                    → Depositar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTransferModeChange('withdraw')}
                    className={`
                      py-2 rounded-lg text-xs font-semibold transition-all duration-200
                      ${transferMode === 'withdraw'
                        ? 'bg-accent-blue text-white shadow-sm shadow-accent-blue/20'
                        : 'bg-bg-secondary text-text-secondary border border-border-color hover:border-accent-blue/30 hover:text-text-primary'
                      }
                    `}
                  >
                    ← Retirar
                  </button>
                </div>
              )}
            </div>

            {/* Amount - prominent */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
                Monto (ARS) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm font-semibold">
                  $
                </span>
                <input
                  ref={amountRef}
                  type="text"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={e => handleAmountChange(e.target.value)}
                  placeholder="0"
                  required
                  className={`${inputClass} pl-7 text-lg font-bold tabular-nums`}
                />
                {form.amount > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
                    ${formatARS(form.amount)}
                  </span>
                )}
              </div>
            </div>

            {/* Sugerencia de monto para Vivienda */}
            {form.type === 'expense' && form.category === 'Vivienda' && housingContract && (() => {
              const suggested = getAmountForDate(housingContract, form.date || format(new Date(), 'yyyy-MM-dd'));
              return (
                <div className="flex items-center justify-between gap-3 px-3 py-2 bg-accent-blue/8 border border-accent-blue/20 rounded-xl animate-fade-in">
                  <span className="text-xs text-text-secondary">
                    Alquiler este mes: <span className="font-semibold text-text-primary">${formatARS(suggested)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAmountInput(String(suggested));
                      setForm(prev => ({ ...prev, amount: suggested }));
                    }}
                    className="text-xs font-medium text-accent-blue hover:text-blue-400 transition-colors shrink-0"
                  >
                    Usar
                  </button>
                </div>
              );
            })()}

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
                Descripción
              </label>
              <input
                type="text"
                value={form.description ?? ''}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Opcional..."
                className={inputClass}
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Calendar size={10} />
                Fecha *
              </label>
              <DatePicker
                value={form.date}
                onChange={date => setForm(prev => ({ ...prev, date }))}
                required
                className={inputClass}
              />
            </div>

            {/* Dollar type + USD amount — only shown for savings categories */}
            {form.type === 'expense' && SAVINGS_CATEGORIES.includes(form.category) && (
              <div className="space-y-2 p-3 bg-accent-green/5 border border-accent-green/20 rounded-xl animate-fade-in">
                <label className="block text-xs font-semibold text-accent-green uppercase tracking-wider">
                  Dólar utilizado <span className="normal-case font-normal text-text-secondary">(opcional)</span>
                </label>
                {dollarRates.length > 0 ? (
                  <select
                    value={form.dollar_type ?? ''}
                    onChange={e => handleDollarTypeChange(e.target.value || null)}
                    className={`${inputClass} text-sm`}
                  >
                    <option value="">Seleccionar dólar...</option>
                    {dollarRates.map(rate => (
                      <option key={rate.casa} value={rate.casa}>
                        {rate.nombre.replace('Dólar ', '').replace('dólar ', '')} - ${formatARS(rate.venta)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-text-secondary">Cargando cotizaciones…</p>
                )}
                <div>
                  <label className="block text-[10px] text-text-secondary mb-1 uppercase tracking-wider">
                    Monto USD {form.dollar_type ? '(calculado automáticamente)' : '(manual)'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm font-semibold">U$S</span>
                    <input
                      type="number"
                      value={form.amount_usd ?? ''}
                      onChange={e => setForm(prev => ({
                        ...prev,
                        amount_usd: e.target.value ? parseFloat(e.target.value) : null,
                      }))}
                      placeholder="0.00"
                      min="0"
                      step="any"
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Recurrente — para transacciones nuevas y edición (no transfer, no desde template) */}
            {!recurringTemplate && formMode !== 'transfer' && (
              <div>
                <button
                  type="button"
                  onClick={() => setIsRecurring(r => !r)}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all duration-150 text-sm
                    ${isRecurring
                      ? 'bg-accent-blue/10 border-accent-blue/40 text-accent-blue'
                      : 'bg-bg-secondary border-border-color text-text-secondary hover:border-text-secondary/50 hover:text-text-primary'
                    }
                  `}
                >
                  <RefreshCw size={14} className={isRecurring ? 'text-accent-blue' : ''} />
                  <span className="font-medium">Es un pago recurrente</span>
                  <div className={`ml-auto w-8 h-4.5 rounded-full transition-all duration-200 flex items-center px-0.5 ${isRecurring ? 'bg-accent-blue' : 'bg-border-color'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-all duration-200 ${isRecurring ? 'translate-x-3.5' : 'translate-x-0'}`} />
                  </div>
                </button>

                {isRecurring && (
                  <div className="mt-2 p-3 bg-accent-blue/8 border border-accent-blue/20 rounded-xl animate-fade-in">
                    <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wider">
                      Frecuencia
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                      {(Object.entries(RECURRENCE_LABELS) as [RecurrenceFrequency, string][]).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setRecurringFrequency(key)}
                          className={`
                            py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-150
                            ${recurringFrequency === key
                              ? 'bg-accent-blue text-white shadow-sm'
                              : 'bg-bg-secondary text-text-secondary border border-border-color hover:border-accent-blue/40 hover:text-text-primary'
                            }
                          `}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Badge cuando viene de un template recurrente */}
            {recurringTemplate && (
              <div className="flex items-center gap-2 px-3 py-2 bg-accent-blue/8 border border-accent-blue/20 rounded-xl text-xs text-accent-blue">
                <RefreshCw size={12} />
                <span>Registrando pago recurrente</span>
              </div>
            )}

            {/* Comprobante */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
                Comprobante
              </label>
              {(() => {
                const existingFilename = !removeReceipt ? (transaction?.receipt_path ?? null) : null;
                const displayPath = pendingFilePath ?? (existingFilename ? existingFilename : null);

                if (displayPath) {
                  const name = displayPath.includes('/') || displayPath.includes('\\')
                    ? displayPath.split(/[\\/]/).pop()!
                    : displayPath;
                  return (
                    <div className="flex items-center gap-2 px-3 py-2 bg-accent-blue/8 border border-accent-blue/25 rounded-xl">
                      <Paperclip size={13} className="text-accent-blue flex-shrink-0" />
                      <span className="text-xs text-text-primary flex-1 truncate" title={name}>{name}</span>
                      <button
                        type="button"
                        onClick={handlePickFile}
                        className="text-xs text-text-secondary hover:text-accent-blue transition-colors shrink-0"
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveReceipt}
                        className="p-1 rounded-lg text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-all"
                      >
                        <FileX size={13} />
                      </button>
                    </div>
                  );
                }

                return (
                  <button
                    type="button"
                    onClick={handlePickFile}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-border-color text-text-secondary hover:border-accent-blue/50 hover:text-accent-blue hover:bg-accent-blue/5 transition-all duration-150 text-xs"
                  >
                    <Paperclip size={13} />
                    Adjuntar comprobante (PDF, PNG, JPG)
                  </button>
                );
              })()}
            </div>

            {error && (
              <div className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/25 rounded-xl px-3 py-2.5 animate-fade-in">
                {error}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: categories grid (hidden in transfer mode) */}
          {formMode !== 'transfer' && (
            <div className="w-full lg:w-80 flex-shrink-0 overflow-y-auto p-5 space-y-4 flex flex-col">
              <div className="flex-1">
                <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
                  Categoría *
                </label>
                <div className="grid grid-cols-4 gap-1.5 max-h-96 overflow-y-auto pr-0.5">
                  {categories.map(cat => {
                    const isSelected = form.category === cat;
                    const color = getCategoryColor(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, category: cat }))}
                        className={`
                          flex flex-col items-center gap-1 p-2 rounded-xl text-xs font-medium
                          transition-colors duration-150 border
                          ${isSelected
                            ? 'border-opacity-60 shadow-sm'
                            : 'border-border-color bg-bg-secondary text-text-secondary hover:border-text-secondary/60 hover:text-text-primary'
                          }
                        `}
                        style={isSelected ? {
                          backgroundColor: `${color}18`,
                          borderColor: `${color}50`,
                          color,
                        } : {}}
                      >
                        <span className="text-base leading-none">{categoryIcons[cat] ?? '💳'}</span>
                        <span className="text-center leading-tight" style={{ fontSize: '10px' }}>
                          {cat.length > 8 ? cat.slice(0, 7) + '…' : cat}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 flex-shrink-0">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomCategory();
                    }
                  }}
                  placeholder="Nueva categoría…"
                  className={`${inputClass} flex-1 text-xs py-2`}
                />
                <button
                  type="button"
                  onClick={handleAddCustomCategory}
                  disabled={addingCategory}
                  className="w-full px-3 py-2 rounded-xl text-xs font-medium border border-border-color text-text-secondary hover:text-accent-blue hover:border-accent-blue/40 transition-all disabled:opacity-50"
                >
                  {addingCategory ? '…' : 'Agregar'}
                </button>
              </div>
            </div>
          )}

          {/* Column shift for transfer mode: show full width form */}
          {formMode === 'transfer' && (
            <div className="hidden"></div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="border-t border-border-color px-5 py-4 bg-bg-card flex-shrink-0 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm text-text-secondary border border-border-color hover:bg-bg-secondary hover:text-text-primary transition-all duration-150"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className={`
              flex-1 py-2.5 rounded-xl text-sm font-semibold text-white
              flex items-center justify-center gap-2 transition-all duration-200
              hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100
              shadow-lg
              ${formMode === 'income'
                ? 'bg-accent-green hover:bg-green-500 shadow-accent-green/20'
                : formMode === 'transfer'
                ? 'bg-accent-blue hover:bg-blue-500 shadow-accent-blue/20'
                : 'bg-accent-blue hover:bg-blue-500 shadow-accent-blue/20'
              }
            `}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {transaction ? <Save size={14} /> : <Plus size={14} />}
                {transaction ? 'Guardar cambios' : 'Agregar'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
