import React, { useState, useEffect } from 'react';
import { Percent, AlertCircle, CheckCircle, RotateCcw } from 'lucide-react';
import { Rule502030 } from '../dashboard/Rule502030';
import { Transaction, Rule502030Group, Rule502030Percentages } from '../../types';
import { Rule502030Mapping, assignmentToMapping, buildAssignmentForCategories } from '../../lib/rule502030Mapping';
import { DEFAULT_PERCENTAGES } from '../../lib/rule502030';
import { logError, getReadableError } from '../../lib/db';

interface Rule502030ViewProps {
  transactions: Transaction[];
  totalIncome: number;
  expenseCategories: string[];
  mapping: Rule502030Mapping | null;
  effectiveMapping: Rule502030Mapping;
  percentages: Rule502030Percentages;
  startDate?: string;
  endDate?: string;
  onSave: (m: Rule502030Mapping) => Promise<void>;
  onSavePercentages: (p: Rule502030Percentages) => Promise<void>;
  onReset: () => Promise<void>;
}

const GROUP_META: { value: Rule502030Group; icon: string; label: string }[] = [
  { value: 'Necesidades', icon: '🏠', label: 'Necesidades' },
  { value: 'Deseos', icon: '🎮', label: 'Deseos' },
  { value: 'Ahorro/Inversión', icon: '💰', label: 'Ahorro / Inversión' },
];

export const Rule502030View = React.memo((props: Rule502030ViewProps) => {
  const {
    transactions,
    totalIncome,
    expenseCategories,
    mapping,
    effectiveMapping,
    percentages,
    startDate,
    endDate,
    onSave,
    onSavePercentages,
    onReset,
  } = props;
  const [assign, setAssign] = useState<Record<string, Rule502030Group>>({});
  const [localPct, setLocalPct] = useState<Rule502030Percentages>(percentages);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const expenseKey = expenseCategories.join('\0');

  useEffect(() => {
    setAssign(buildAssignmentForCategories(expenseCategories, mapping));
  }, [expenseKey, mapping]);

  // Sync local state when external percentages change (e.g. after reset)
  useEffect(() => {
    setLocalPct(percentages);
  }, [percentages]);

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
      await Promise.all([
        onSave(assignmentToMapping(assign)),
        onSavePercentages(localPct),
      ]);
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
      await Promise.all([
        onReset(),
        onSavePercentages(DEFAULT_PERCENTAGES),
      ]);
      setLocalPct(DEFAULT_PERCENTAGES);
      showMessage('success', 'Restaurado al criterio por defecto');
    } catch (err) {
      await logError('Rule502030View.handleReset', err);
      showMessage('error', getReadableError(err));
    } finally {
      setSaving(false);
    }
  };

  const updatePct = (group: Rule502030Group, raw: string) => {
    const val = Math.max(0, Math.min(100, parseInt(raw, 10) || 0));
    setLocalPct(prev => ({ ...prev, [group]: val }));
  };

  const groupOptions = GROUP_META.map(g => ({
    value: g.value,
    label: `${g.label} (${localPct[g.value]}%)`,
  }));

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
        percentages={localPct}
        startDate={startDate}
        endDate={endDate}
      />

      {/* Percentage editor */}
      <div className="bg-bg-card border border-border-color rounded-xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Percent size={14} className="text-accent-blue" />
            <h3 className="text-sm font-semibold text-text-primary">Distribución de porcentajes</h3>
          </div>
          <button
            type="button"
            onClick={() => setLocalPct(DEFAULT_PERCENTAGES)}
            disabled={saving}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-border-color text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
          >
            <RotateCcw size={11} />
            50/30/20
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {GROUP_META.map(g => (
            <div key={g.value} className="flex items-center gap-3">
              <span className="text-base w-6 text-center leading-none">{g.icon}</span>
              <span className="text-sm text-text-primary w-40">{g.label}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={localPct[g.value]}
                  onChange={e => updatePct(g.value, e.target.value)}
                  className="w-16 bg-bg-secondary border border-border-color rounded-lg px-2.5 py-1.5 text-sm text-text-primary text-center focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 transition-all"
                />
                <span className="text-sm text-text-secondary">%</span>
              </div>
            </div>
          ))}
        </div>

        <div className={`flex items-center gap-2 mt-4 text-xs font-medium ${pctValid ? 'text-accent-green' : 'text-accent-red'}`}>
          {pctValid ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
          Total: {pctSum}%
          {!pctValid && <span className="text-text-secondary font-normal ml-1">— debe sumar 100%</span>}
        </div>
      </div>

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
              disabled={saving || expenseCategories.length === 0 || !pctValid}
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
});
