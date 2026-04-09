import React, { useState, useEffect } from 'react';
import { Percent, AlertCircle, CheckCircle } from 'lucide-react';
import { Rule502030 } from '../dashboard/Rule502030';
import { Transaction, Rule502030Group } from '../../types';
import { Rule502030Mapping, assignmentToMapping, buildAssignmentForCategories } from '../../lib/rule502030Mapping';
import { logError, getReadableError } from '../../lib/db';

interface Rule502030ViewProps {
  transactions: Transaction[];
  totalIncome: number;
  expenseCategories: string[];
  mapping: Rule502030Mapping | null;
  effectiveMapping: Rule502030Mapping;
  onSave: (m: Rule502030Mapping) => Promise<void>;
  onReset: () => Promise<void>;
}

const GROUP_OPTIONS: { value: Rule502030Group; label: string }[] = [
  { value: 'Necesidades', label: 'Necesidades (50%)' },
  { value: 'Deseos', label: 'Deseos (30%)' },
  { value: 'Ahorro/Inversión', label: 'Ahorro / Inversión (20%)' },
];

export const Rule502030View: React.FC<Rule502030ViewProps> = ({
  transactions,
  totalIncome,
  expenseCategories,
  mapping,
  effectiveMapping,
  onSave,
  onReset,
}) => {
  const [assign, setAssign] = useState<Record<string, Rule502030Group>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const expenseKey = expenseCategories.join('\0');

  useEffect(() => {
    setAssign(buildAssignmentForCategories(expenseCategories, mapping));
  }, [expenseKey, mapping]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(assignmentToMapping(assign));
      showMessage('success', 'Agrupación guardada');
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
      await onReset();
      showMessage('success', 'Restaurado al criterio por defecto');
    } catch (err) {
      await logError('Rule502030View.handleReset', err);
      showMessage('error', getReadableError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Regla 50/30/20</h2>
        <p className="text-sm text-text-secondary mt-1">
          Seguí cuánto de tus ingresos va a necesidades, deseos y ahorro.
        </p>
      </div>

      {/* Widget — same as dashboard but wider */}
      <Rule502030
        transactions={transactions}
        totalIncome={totalIncome}
        mapping={effectiveMapping}
      />

      {/* Assignment form */}
      <div className="bg-bg-card border border-border-color rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Percent size={14} className="text-accent-purple" />
            <h3 className="text-sm font-semibold text-text-primary">Agrupación de categorías</h3>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving || expenseCategories.length === 0}
              className="px-3 py-1.5 rounded-lg text-xs border border-border-color text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
            >
              Valores por defecto
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || expenseCategories.length === 0}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-blue text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>

        <p className="text-xs text-text-secondary mb-3">
          Elegí en qué bloque cae cada categoría de gasto. El gasto que no coincida se trata como "Deseos".
        </p>

        <div className="max-h-72 overflow-y-auto rounded-lg border border-border-color/60">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-bg-secondary border-b border-border-color">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-text-secondary">Categoría</th>
                <th className="text-left px-3 py-2 font-medium text-text-secondary w-56">Grupo</th>
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
                      className="w-full max-w-[220px] bg-bg-secondary border border-border-color rounded-md px-2 py-1 text-text-primary focus:outline-none focus:border-accent-blue"
                    >
                      {GROUP_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {expenseCategories.length === 0 && (
          <p className="text-xs text-text-secondary mt-2 italic">No hay categorías de gasto cargadas aún.</p>
        )}

        {message && (
          <div className={`
            flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs border mt-3 animate-fade-in
            ${message.type === 'success'
              ? 'bg-accent-green/10 border-accent-green/20 text-accent-green'
              : 'bg-accent-red/10 border-accent-red/20 text-accent-red'
            }
          `}>
            {message.type === 'success' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
};
