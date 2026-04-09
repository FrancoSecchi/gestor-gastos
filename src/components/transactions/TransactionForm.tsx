import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Save, Plus, Eye, Calendar } from 'lucide-react';
import { DatePicker } from '../ui/DatePicker';
import { Transaction, NewTransaction, TransactionType, getCategoryColor } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatARS } from '../../lib/export';
import { HousingContract, getAmountForDate } from '../../lib/housingContract';

interface TransactionFormProps {
  transaction?: Transaction | null;
  expenseCategories: string[];
  incomeCategories: string[];
  categoryIcons: Record<string, string>;
  housingContract?: HousingContract | null;
  onAddCustomCategory: (type: TransactionType, name: string) => Promise<void>;
  onSave: (tx: NewTransaction | Transaction) => Promise<void>;
  onClose: () => void;
}


const defaultForm: NewTransaction = {
  type: 'expense',
  amount: 0,
  amount_usd: null,
  category: 'Comida',
  subcategory: null,
  description: '',
  date: format(new Date(), 'yyyy-MM-dd'),
};

function formatAmountDisplay(value: number): string {
  if (!value) return '';
  return formatARS(value);
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  transaction,
  expenseCategories,
  incomeCategories,
  categoryIcons,
  housingContract,
  onAddCustomCategory,
  onSave,
  onClose,
}) => {
  const [form, setForm] = useState<NewTransaction>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [mounted, setMounted] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (transaction) {
      setForm({
        type: transaction.type,
        amount: transaction.amount,
        amount_usd: transaction.amount_usd ?? null,
        category: transaction.category,
        subcategory: transaction.subcategory ?? null,
        description: transaction.description ?? '',
        date: transaction.date,
      });
      setAmountInput(transaction.amount > 0 ? String(transaction.amount) : '');
    } else {
      setForm(defaultForm);
      setAmountInput('');
    }
  }, [transaction]);

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  const categories = useMemo(() => {
    const base = form.type === 'expense' ? expenseCategories : incomeCategories;
    if (form.category && !base.includes(form.category)) {
      return [form.category, ...base];
    }
    return base;
  }, [form.type, form.category, expenseCategories, incomeCategories]);

  const handleTypeChange = (type: TransactionType) => {
    const list = type === 'expense' ? expenseCategories : incomeCategories;
    const defaultCat = list[0] ?? (type === 'expense' ? 'Comida' : 'Salario');
    setForm(prev => ({ ...prev, type, category: defaultCat }));
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
    // Allow only numbers and decimal point
    const cleaned = raw.replace(/[^0-9.]/g, '');
    setAmountInput(cleaned);
    const parsed = parseFloat(cleaned) || 0;
    setForm(prev => ({ ...prev, amount: parsed }));
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
      if (transaction) {
        await onSave({ ...transaction, ...form });
      } else {
        await onSave(form);
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
          bg-bg-card border border-border-color rounded-2xl w-full max-w-md shadow-2xl
          transition-all duration-300
          ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}
        `}
      >
        {/* Header */}
        <div className={`
          flex items-center justify-between px-5 py-4 border-b border-border-color rounded-t-2xl
          ${form.type === 'income'
            ? 'bg-gradient-to-r from-accent-green/5 to-transparent'
            : 'bg-gradient-to-r from-accent-red/5 to-transparent'
          }
        `}>
          <div className="flex items-center gap-3">
            <div className={`
              w-8 h-8 rounded-xl flex items-center justify-center text-base
              ${form.type === 'income' ? 'bg-accent-green/15' : 'bg-accent-red/15'}
            `}>
              {categoryIcons[form.category] ?? '💳'}
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
          <div className="px-5 pt-3 pb-0 animate-fade-in">
            <div className={`
              flex items-center gap-3 p-3 rounded-xl border
              ${form.type === 'income'
                ? 'bg-accent-green/8 border-accent-green/20'
                : 'bg-accent-red/8 border-accent-red/20'
              }
            `}>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ backgroundColor: `${getCategoryColor(form.category)}25` }}
              >
                {categoryIcons[form.category] ?? '💳'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-primary truncate">
                  {form.category}
                  {form.description ? ` · ${form.description}` : ''}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {dateFormatted || 'Sin fecha'}
                </p>
              </div>
              <span className={`text-base font-bold tabular-nums flex-shrink-0 ${
                form.type === 'income' ? 'text-accent-green' : 'text-accent-red'
              }`}>
                {form.type === 'income' ? '+' : '-'}${formatAmountDisplay(form.amount)}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(['expense', 'income'] as TransactionType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  className={`
                    py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                    hover:scale-[1.02] active:scale-[0.98]
                    ${form.type === type
                      ? type === 'expense'
                        ? 'bg-accent-red/20 text-accent-red border border-accent-red/40 shadow-sm shadow-accent-red/10'
                        : 'bg-accent-green/20 text-accent-green border border-accent-green/40 shadow-sm shadow-accent-green/10'
                      : 'bg-bg-secondary text-text-secondary border border-border-color hover:border-text-secondary/50'
                    }
                  `}
                >
                  {type === 'expense' ? '↓ Gasto' : '↑ Ingreso'}
                </button>
              ))}
            </div>
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

          {/* Category — visual grid */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
              Categoría *
            </label>
            <div className="grid grid-cols-4 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
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
                      transition-all duration-150 hover:scale-105 active:scale-95 border
                      ${isSelected
                        ? 'border-opacity-60 shadow-sm'
                        : 'border-border-color bg-bg-secondary text-text-secondary hover:border-border-color/80 hover:text-text-primary'
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
            <div className="mt-2 flex gap-2">
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
                className="px-3 py-2 rounded-xl text-xs font-medium border border-border-color text-text-secondary hover:text-accent-blue hover:border-accent-blue/40 transition-all shrink-0 disabled:opacity-50"
              >
                {addingCategory ? '…' : 'Agregar'}
              </button>
            </div>
          </div>

          {/* Description + Date */}
          <div className="grid grid-cols-2 gap-3">
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
          </div>

          {/* USD amount (optional, collapsible) */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
              Monto en USD <span className="normal-case text-text-secondary font-normal">(opcional)</span>
            </label>
            <input
              type="number"
              value={form.amount_usd ?? ''}
              onChange={e => setForm(prev => ({
                ...prev,
                amount_usd: e.target.value ? parseFloat(e.target.value) : null
              }))}
              placeholder="0.00"
              min="0"
              step="any"
              className={inputClass}
            />
          </div>

          {error && (
            <div className="text-xs text-accent-red bg-accent-red/10 border border-accent-red/25 rounded-xl px-3 py-2.5 animate-fade-in">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm text-text-secondary border border-border-color hover:bg-bg-secondary hover:text-text-primary transition-all duration-150"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`
                flex-1 py-2.5 rounded-xl text-sm font-semibold text-white
                flex items-center justify-center gap-2 transition-all duration-200
                hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100
                shadow-lg
                ${form.type === 'income'
                  ? 'bg-accent-green hover:bg-green-500 shadow-accent-green/20'
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
        </form>
      </div>
    </div>
  );
};
