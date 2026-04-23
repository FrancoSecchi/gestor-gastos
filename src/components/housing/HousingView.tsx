import React, { useState, useMemo, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format, parseISO, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Home, Plus, Pencil, Trash2, Loader2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { DatePicker } from '../ui/DatePicker';
import { InfoTooltip } from '../ui/InfoTooltip';
import {
  HousingContract,
  HousingAdjustment,
  IndexType,
  PendingAdjustment,
  buildChartData,
  getContractEndDate,
  getCurrentAmount,
  getNextAdjustmentDate,
  getLastICLValue,
  getLastAmount,
  calculateNewAmount,
  fetchICLValue,
  fetchIPCAccumulated,
  getPendingAdjustments,
  fetchPendingAdjustments,
  getAccumulatedRent,
} from '../../lib/housingContract';
import { formatARS } from '../../lib/export';

interface HousingViewProps {
  contract: HousingContract | null;
  loading: boolean;
  hasRentalContract: boolean;
  onSetHasRental: (value: boolean) => Promise<void>;
  onSave: (c: HousingContract) => Promise<void>;
  onDelete: () => Promise<void>;
}

const FREQUENCY_OPTIONS = [
  { value: 3, label: 'Trimestral (cada 3 meses)' },
  { value: 6, label: 'Semestral (cada 6 meses)' },
  { value: 12, label: 'Anual (cada 12 meses)' },
];

const DURATION_OPTIONS = [
  { value: 24, label: '2 años (24 meses)' },
  { value: 36, label: '3 años (36 meses)' },
  { value: 48, label: '4 años (48 meses)' },
];

const today = format(new Date(), 'yyyy-MM-dd');

// ── Formulario de setup / edición de contrato ──────────────────────────────

interface ContractFormProps {
  initial?: HousingContract;
  onSubmit: (c: HousingContract) => Promise<void>;
  onCancel?: () => void;
}

const emptyForm = {
  startDate: today,
  initialAmount: '',
  indexType: 'ICL' as IndexType,
  frequencyMonths: 6,
  durationMonths: 24,
  initialIndexValue: '',
};

const ContractForm: React.FC<ContractFormProps> = ({ initial, onSubmit, onCancel }) => {
  const [form, setForm] = useState({
    startDate: initial?.startDate ?? today,
    initialAmount: initial ? String(initial.initialAmount) : '',
    indexType: initial?.indexType ?? ('ICL' as IndexType),
    frequencyMonths: initial?.frequencyMonths ?? 6,
    durationMonths: initial?.durationMonths ?? 24,
    initialIndexValue: initial ? String(initial.initialIndexValue) : '',
  });
  const [saving, setSaving] = useState(false);
  const [fetchingICL, setFetchingICL] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchICLInitial = async () => {
    setFetchingICL(true);
    setError(null);
    try {
      const val = await fetchICLValue();
      setForm(f => ({ ...f, initialIndexValue: String(val) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo obtener el ICL');
    } finally {
      setFetchingICL(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.initialAmount);
    const indexVal = parseFloat(form.initialIndexValue) || 0;
    if (!amount || amount <= 0) { setError('El monto inicial debe ser mayor a 0'); return; }
    if (form.indexType === 'ICL' && indexVal <= 0) { setError('El valor inicial del ICL es necesario para calcular ajustes'); return; }

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        startDate: form.startDate,
        initialAmount: amount,
        indexType: form.indexType,
        frequencyMonths: form.frequencyMonths,
        durationMonths: form.durationMonths,
        initialIndexValue: indexVal,
        adjustments: initial?.adjustments ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full bg-bg-secondary border border-border-color rounded-xl px-3 py-2.5 text-sm text-text-primary ' +
    'focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 placeholder-text-secondary transition-all';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Fecha de inicio */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
            Fecha de inicio del contrato
          </label>
          <DatePicker
            value={form.startDate}
            onChange={startDate => setForm(f => ({ ...f, startDate }))}
            className={inputClass}
          />
        </div>

        {/* Monto inicial */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
            Monto inicial (ARS)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm font-semibold">$</span>
            <input
              type="text"
              inputMode="decimal"
              value={form.initialAmount}
              onChange={e => setForm(f => ({ ...f, initialAmount: e.target.value.replace(/[^0-9.]/g, '') }))}
              placeholder="0"
              className={`${inputClass} pl-7`}
            />
          </div>
        </div>

        {/* Tipo de índice */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
            Índice de actualización
          </label>
          <select
            value={form.indexType}
            onChange={e => setForm(f => ({ ...f, indexType: e.target.value as IndexType }))}
            className={inputClass}
          >
            <option value="ICL">ICL (BCRA)</option>
            <option value="IPC">IPC (INDEC)</option>
          </select>
        </div>

        {/* Frecuencia */}
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
            Frecuencia de ajuste
          </label>
          <select
            value={form.frequencyMonths}
            onChange={e => setForm(f => ({ ...f, frequencyMonths: Number(e.target.value) }))}
            className={inputClass}
          >
            {FREQUENCY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Duración */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
            Duración del contrato
          </label>
          <div className="flex gap-2">
            {DURATION_OPTIONS.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, durationMonths: o.value }))}
                className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                  form.durationMonths === o.value
                    ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue'
                    : 'border-border-color text-text-secondary hover:text-text-primary hover:border-border-color/80'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Valor ICL al inicio — solo para ICL (necesario para calcular el primer ajuste) */}
      {form.indexType === 'ICL' && (
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5 uppercase tracking-wider">
            Valor ICL al inicio del contrato
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={form.initialIndexValue}
              onChange={e => setForm(f => ({ ...f, initialIndexValue: e.target.value.replace(/[^0-9.]/g, '') }))}
              placeholder="Ej: 2847.35"
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={handleFetchICLInitial}
              disabled={fetchingICL}
              className="px-3 py-2 rounded-xl text-xs font-medium border border-border-color text-text-secondary hover:text-accent-blue hover:border-accent-blue/40 transition-all shrink-0 disabled:opacity-50 flex items-center gap-1.5"
            >
              {fetchingICL ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Obtener ICL actual
            </button>
          </div>
          <p className="text-xs text-text-secondary mt-1.5">Necesario para calcular el primer ajuste. Se obtiene de BCRA.</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-accent-red bg-accent-red/10 border border-accent-red/25 rounded-xl px-3 py-2.5">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm text-text-secondary border border-border-color hover:bg-bg-secondary hover:text-text-primary transition-all"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-accent-blue hover:bg-blue-500 transition-all shadow-lg shadow-accent-blue/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear contrato'}
        </button>
      </div>
    </form>
  );
};

// ── Formulario de ajuste ───────────────────────────────────────────────────

interface AdjustmentFormProps {
  contract: HousingContract;
  onAdd: (adj: HousingAdjustment) => Promise<void>;
  onCancel: () => void;
}

const AdjustmentForm: React.FC<AdjustmentFormProps> = ({ contract, onAdd, onCancel }) => {
  const suggestedDate = getNextAdjustmentDate(contract);
  const [date, setDate] = useState(suggestedDate);
  const [indexValue, setIndexValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [fetchingIndex, setFetchingIndex] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedIndex = parseFloat(indexValue) || 0;
  const newAmount = parsedIndex > 0 ? calculateNewAmount(contract, parsedIndex) : null;
  // Para IPC parsedIndex ya ES la variación %; para ICL calculamos el % vs el último ICL
  const lastICL = getLastICLValue(contract);
  const pct = contract.indexType === 'IPC'
    ? (parsedIndex > 0 ? parsedIndex.toFixed(1) : null)
    : (parsedIndex > 0 && lastICL > 0 ? ((parsedIndex / lastICL - 1) * 100).toFixed(1) : null);

  // Fecha de inicio del período: mes siguiente al último ajuste (o al inicio del contrato)
  const periodFrom = useMemo(() => {
    const sorted = [...contract.adjustments].sort((a, b) => a.date.localeCompare(b.date));
    const lastDate = sorted.length > 0 ? sorted[sorted.length - 1].date : contract.startDate;
    return format(parseISO(lastDate), 'yyyy-MM');
  }, [contract]);

  const handleFetchIndex = async () => {
    setFetchingIndex(true);
    setError(null);
    try {
      if (contract.indexType === 'IPC') {
        // El mes del ajuste no entra en el cálculo: hasta = mes anterior a la fecha de ajuste
        const hasta = format(subMonths(parseISO(date), 1), 'yyyy-MM');
        const accumulated = await fetchIPCAccumulated(periodFrom, hasta);
        setIndexValue(String(accumulated));
      } else {
        const val = await fetchICLValue();
        setIndexValue(String(val));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : `No se pudo obtener el ${contract.indexType}`);
    } finally {
      setFetchingIndex(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedIndex || parsedIndex <= 0) { setError('Ingresá el valor del índice'); return; }
    if (!newAmount) return;
    setSaving(true);
    setError(null);
    try {
      await onAdd({ date, indexValue: parsedIndex, amount: newAmount });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full bg-bg-secondary border border-border-color rounded-xl px-3 py-2.5 text-sm text-text-primary ' +
    'focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20 placeholder-text-secondary transition-all';

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 bg-bg-secondary rounded-xl border border-border-color space-y-3 animate-fade-in">
      <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Nuevo ajuste</h4>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Fecha del ajuste</label>
          <DatePicker value={date} onChange={setDate} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            {contract.indexType === 'IPC' ? 'Variación acumulada del período (%)' : 'Valor ICL'}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                inputMode="decimal"
                value={indexValue}
                onChange={e => setIndexValue(e.target.value.replace(/[^0-9.]/g, ''))}
                placeholder={contract.indexType === 'IPC' ? 'Ej: 45.2' : 'Ej: 3420.50'}
                className={`${inputClass} w-full ${contract.indexType === 'IPC' ? 'pr-6' : ''}`}
              />
              {contract.indexType === 'IPC' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">%</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleFetchIndex}
              disabled={fetchingIndex}
              title={contract.indexType === 'IPC'
                ? `Obtener IPC acumulado ${periodFrom} → ${format(subMonths(parseISO(date), 1), 'yyyy-MM')}`
                : 'Obtener ICL actual de BCRA'}
              className="px-2.5 rounded-xl border border-border-color text-text-secondary hover:text-accent-blue hover:border-accent-blue/40 transition-all disabled:opacity-50"
            >
              {fetchingIndex ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            </button>
          </div>
          {contract.indexType === 'IPC' && periodFrom && (
            <p className="text-xs text-text-secondary mt-1">
              Período: {periodFrom} → {format(subMonths(parseISO(date), 1), 'yyyy-MM')} · acumulado compuesto vía argly
            </p>
          )}
        </div>
      </div>

      {newAmount !== null && (
        <div className="flex items-center gap-3 px-3 py-2.5 bg-accent-blue/8 border border-accent-blue/20 rounded-xl">
          <CheckCircle size={14} className="text-accent-blue shrink-0" />
          <div className="text-xs">
            <span className="text-text-secondary">Nuevo monto: </span>
            <span className="font-bold text-text-primary">${formatARS(newAmount)}</span>
            {pct && (
              <span className="ml-2 text-accent-green font-medium">+{pct}%</span>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-accent-red bg-accent-red/10 border border-accent-red/25 rounded-xl px-3 py-2.5">
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 rounded-xl text-xs text-text-secondary border border-border-color hover:bg-bg-card transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || !newAmount}
          className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-accent-blue hover:bg-blue-500 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Registrar
        </button>
      </div>
    </form>
  );
};

// ── Tooltip del gráfico ────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length || !label) return null;
  const value = payload[0]?.value ?? payload[1]?.value;
  if (!value) return null;
  return (
    <div className="bg-bg-card border border-border-color rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="text-text-secondary mb-0.5">
        {format(parseISO(label), "d 'de' MMMM yyyy", { locale: es })}
      </p>
      <p className="font-bold text-text-primary">${formatARS(value)}</p>
    </div>
  );
};

// ── Vista principal ────────────────────────────────────────────────────────

type EstimateResult =
  | { kind: 'stable';   amount: number }
  | { kind: 'adjusted'; amount: number; pct: number }
  | { kind: 'fallback'; amount: number; reason: string };

export const HousingView: React.FC<HousingViewProps> = ({ contract, loading, hasRentalContract, onSetHasRental, onSave, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingAdjustments, setPendingAdjustments] = useState<PendingAdjustment[]>([]);
  const [fetchingPending, setFetchingPending] = useState(false);
  const [pendingResult, setPendingResult] = useState<{ applied: number; failed: { date: string; error: string }[] } | null>(null);
  const [nextEstimate, setNextEstimate] = useState<EstimateResult | null>(null);
  const [fetchingEstimate, setFetchingEstimate] = useState(false);
  const [manualIndexValues, setManualIndexValues] = useState<Record<string, string>>({});
  const [applyingManual, setApplyingManual] = useState<Record<string, boolean>>({});

  // Solo los ajustes pendientes cuya fecha ya pasó (≤ hoy): los futuros no tienen datos disponibles
  const pastPendingAdjustments = pendingAdjustments.filter(p => p.date <= today);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3500);
  };

  const chartData = useMemo(() => contract ? buildChartData(contract) : [], [contract]);
  const accumulatedRent = useMemo(() => contract ? getAccumulatedRent(contract) : 0, [contract]);

  // Detectar ajustes pendientes y estimar próximo aumento cuando cambia el contrato
  useEffect(() => {
    if (!contract) {
      setPendingAdjustments([]);
      setNextEstimate(null);
      return;
    }
    setPendingAdjustments(getPendingAdjustments(contract));
    setPendingResult(null);

    // Estimar cuánto se pagará el próximo mes
    const fetchEstimate = async () => {
      setFetchingEstimate(true);
      setNextEstimate(null);
      try {
        const nextAdjDate = getNextAdjustmentDate(contract);
        const nextMonthStart = format(addMonths(new Date(), 1), 'yyyy-MM-01');
        const currentAmount = getCurrentAmount(contract);

        // Sin ajuste el próximo mes → el monto no cambia, no hace falta la API
        if (nextAdjDate > nextMonthStart) {
          setNextEstimate({ kind: 'stable', amount: currentAmount });
          return;
        }

        // Ajuste pendiente para el próximo mes → intentar estimar con el índice
        const sorted = [...contract.adjustments].sort((a, b) => a.date.localeCompare(b.date));
        const lastDate = sorted.length > 0 ? sorted[sorted.length - 1].date : contract.startDate;
        const periodFrom = format(parseISO(lastDate), 'yyyy-MM');
        const periodTo = format(new Date(), 'yyyy-MM');

        // IPC mismo mes: el período aún no tiene datos completos
        if (contract.indexType === 'IPC' && periodFrom === periodTo) {
          setNextEstimate({ kind: 'fallback', amount: currentAmount, reason: 'Datos del período aún no publicados' });
          return;
        }

        try {
          let indexValue: number;
          if (contract.indexType === 'IPC') {
            indexValue = await fetchIPCAccumulated(periodFrom, periodTo);
          } else {
            indexValue = await fetchICLValue();
          }
          const estimatedAmount = calculateNewAmount(contract, indexValue);
          const lastAmount = getLastAmount(contract);
          const pct = (estimatedAmount / lastAmount - 1) * 100;
          setNextEstimate({ kind: 'adjusted', amount: estimatedAmount, pct });
        } catch {
          setNextEstimate({ kind: 'fallback', amount: currentAmount, reason: 'Estimación no disponible' });
        }
      } finally {
        setFetchingEstimate(false);
      }
    };
    fetchEstimate();
  }, [contract]);

  // Aplica ajustes pendientes para el contrato dado (usado al guardar y desde el botón)
  const applyPending = async (c: HousingContract, pending: PendingAdjustment[]) => {
    if (pending.length === 0) return;
    setFetchingPending(true);
    setPendingResult(null);
    try {
      const { applied, failed } = await fetchPendingAdjustments(c, pending);
      if (applied.length > 0) {
        const updated: HousingContract = {
          ...c,
          adjustments: [...c.adjustments, ...applied].sort((a, b) => a.date.localeCompare(b.date)),
        };
        await onSave(updated);
      }
      setPendingResult({ applied: applied.length, failed });
      if (applied.length > 0 && failed.length === 0) {
        showMsg('success', `${applied.length} ajuste${applied.length > 1 ? 's' : ''} aplicado${applied.length > 1 ? 's' : ''} correctamente`);
      }
    } catch (e) {
      showMsg('error', e instanceof Error ? e.message : 'Error al obtener los ajustes');
    } finally {
      setFetchingPending(false);
    }
  };

  const handleFetchPending = () => {
    if (!contract) return;
    applyPending(contract, pastPendingAdjustments);
  };

  const handleApplyManual = async (pending: PendingAdjustment, indexValueStr: string) => {
    if (!contract) return;
    const indexValue = parseFloat(indexValueStr);
    if (!indexValue || indexValue <= 0) return;

    setApplyingManual(prev => ({ ...prev, [pending.date]: true }));
    try {
      const amount = calculateNewAmount(contract, indexValue);
      const adj: HousingAdjustment = { date: pending.date, indexValue, amount };
      const updated: HousingContract = {
        ...contract,
        adjustments: [...contract.adjustments, adj].sort((a, b) => a.date.localeCompare(b.date)),
      };
      await onSave(updated);
      setPendingResult(prev => prev
        ? { ...prev, failed: prev.failed.filter(f => f.date !== pending.date), applied: prev.applied + 1 }
        : null
      );
      setManualIndexValues(prev => { const next = { ...prev }; delete next[pending.date]; return next; });
      showMsg('success', 'Ajuste aplicado manualmente');
    } catch (e) {
      showMsg('error', e instanceof Error ? e.message : 'Error al aplicar');
    } finally {
      setApplyingManual(prev => ({ ...prev, [pending.date]: false }));
    }
  };

  const currentAmount = contract ? getCurrentAmount(contract) : 0;
  const nextDate = contract ? getNextAdjustmentDate(contract) : null;
  const nextDateFormatted = nextDate
    ? format(parseISO(nextDate), "d 'de' MMMM yyyy", { locale: es })
    : null;
  const endDate = contract ? getContractEndDate(contract) : null;
  const endDateFormatted = endDate
    ? format(parseISO(endDate), "d 'de' MMMM yyyy", { locale: es })
    : null;
  const monthsRemaining = endDate
    ? Math.max(0, Math.round((parseISO(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30.44)))
    : null;

  const handleSaveContract = async (c: HousingContract) => {
    await onSave(c);
    setEditing(false);
    const pending = getPendingAdjustments(c);
    if (pending.length > 0) {
      await applyPending(c, pending);
    } else {
      showMsg('success', 'Contrato guardado');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar el contrato? Esto no borra tus transacciones.')) return;
    await onDelete();
    showMsg('success', 'Contrato eliminado');
  };

  const handleAddAdjustment = async (adj: HousingAdjustment) => {
    if (!contract) return;
    const updated: HousingContract = {
      ...contract,
      adjustments: [...contract.adjustments, adj].sort((a, b) => a.date.localeCompare(b.date)),
    };
    await onSave(updated);
    setShowAdjustForm(false);
    showMsg('success', 'Ajuste registrado');
  };

  const handleDeleteAdjustment = async (date: string) => {
    if (!contract) return;
    if (!window.confirm('¿Eliminar este ajuste?')) return;
    const updated: HousingContract = {
      ...contract,
      adjustments: contract.adjustments.filter(a => a.date !== date),
    };
    await onSave(updated);
  };

  const rentalToggle = (
    <div className="flex items-center justify-between py-3 px-4 bg-bg-card border border-border-color rounded-xl">
      <div>
        <p className="text-sm font-medium text-text-primary">Tengo contrato de alquiler</p>
        <p className="text-xs text-text-secondary mt-0.5">Activá para llevar el seguimiento de tu alquiler</p>
      </div>
      <button
        onClick={() => onSetHasRental(!hasRentalContract)}
        role="switch"
        aria-checked={hasRentalContract}
        style={{ width: 44, height: 24, minWidth: 44 }}
        className={`relative shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
          hasRentalContract ? 'bg-accent-blue' : 'bg-border-color'
        }`}
      >
        <span
          style={{
            width: 18,
            height: 18,
            transform: hasRentalContract ? 'translateX(20px)' : 'translateX(1px)',
          }}
          className="pointer-events-none absolute top-0.5 left-0 inline-block rounded-full bg-white shadow-sm transition-transform duration-200"
        />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-text-secondary">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  // ── Sin contrato de alquiler ──────────────────────────────────────────
  if (!hasRentalContract) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Vivienda</h2>
          <p className="text-sm text-text-secondary mt-0.5">Gestión de tu alquiler</p>
        </div>
        {rentalToggle}
      </div>
    );
  }

  // ── Estado vacío: setup ───────────────────────────────────────────────
  if (!contract || editing) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Vivienda</h2>
          <p className="text-sm text-text-secondary mt-1">
            {contract ? 'Editá los datos de tu contrato.' : 'Configurá tu contrato de alquiler para calcular los ajustes automáticamente.'}
          </p>
        </div>
        {rentalToggle}
        <div className="bg-bg-card border border-border-color rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Home size={14} className="text-accent-blue" />
            <h3 className="text-sm font-semibold text-text-primary">
              {contract ? 'Editar contrato' : 'Nuevo contrato'}
            </h3>
          </div>
          <ContractForm
            initial={contract ?? undefined}
            onSubmit={handleSaveContract}
            onCancel={contract ? () => setEditing(false) : undefined}
          />
        </div>
      </div>
    );
  }

  // ── Vista principal con contrato activo ───────────────────────────────

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Vivienda</h2>
          <p className="text-sm text-text-secondary mt-0.5">Seguimiento de tu contrato de alquiler</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border-color text-text-secondary hover:text-text-primary transition-colors"
          >
            <Pencil size={12} />
            Editar contrato
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border-color text-accent-red hover:bg-accent-red/10 transition-colors"
          >
            <Trash2 size={12} />
            Eliminar
          </button>
        </div>
      </div>

      {rentalToggle}

      {message && (
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs border animate-fade-in ${
          message.type === 'success'
            ? 'bg-accent-green/10 border-accent-green/20 text-accent-green'
            : 'bg-accent-red/10 border-accent-red/20 text-accent-red'
        }`}>
          {message.type === 'success' ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
          {message.text}
        </div>
      )}

      {/* Banner ajustes pendientes — solo para fechas pasadas (≤ hoy) */}
      {pastPendingAdjustments.length > 0 && !pendingResult && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-accent-blue/8 border border-accent-blue/20 rounded-xl animate-fade-in">
          <div className="flex items-center gap-2 text-xs">
            <AlertCircle size={13} className="text-accent-blue shrink-0" />
            <span className="text-text-secondary">
              {pastPendingAdjustments.length === 1
                ? `Hay 1 ajuste sin registrar (${format(parseISO(pastPendingAdjustments[0].date), "MMM yyyy", { locale: es })})`
                : `Hay ${pastPendingAdjustments.length} ajustes sin registrar`}
              {' '}— se puede obtener el {contract.indexType} automáticamente.
            </span>
          </div>
          <button
            onClick={handleFetchPending}
            disabled={fetchingPending}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-blue text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {fetchingPending ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            {fetchingPending ? 'Obteniendo…' : 'Actualizar'}
          </button>
        </div>
      )}

      {/* Resultado del fetch de pendientes */}
      {pendingResult && pendingResult.failed.length > 0 && (
        <div className="px-4 py-3 bg-accent-red/8 border border-accent-red/20 rounded-xl text-xs space-y-3 animate-fade-in">
          {pendingResult.applied > 0 && (
            <p className="text-accent-green flex items-center gap-1.5">
              <CheckCircle size={12} />
              {pendingResult.applied} ajuste{pendingResult.applied > 1 ? 's' : ''} aplicado{pendingResult.applied > 1 ? 's' : ''}
            </p>
          )}
          {pendingResult.failed.map(f => {
            const pendingAdj = pendingAdjustments.find(p => p.date === f.date);
            return (
              <div key={f.date} className="space-y-2">
                <p className="text-accent-red flex items-center gap-1.5">
                  <AlertCircle size={12} className="shrink-0" />
                  {format(parseISO(f.date), "MMM yyyy", { locale: es })}: {f.error}
                </p>
                {pendingAdj && (
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-text-secondary shrink-0">Ingresar manualmente:</span>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={manualIndexValues[f.date] ?? ''}
                        onChange={e => setManualIndexValues(prev => ({
                          ...prev,
                          [f.date]: e.target.value.replace(/[^0-9.]/g, ''),
                        }))}
                        placeholder={contract.indexType === 'IPC' ? 'Ej: 2.9' : 'Ej: 3420.50'}
                        className="w-28 bg-bg-secondary border border-border-color rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-blue placeholder-text-secondary"
                      />
                      {contract.indexType === 'IPC' && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary text-xs">%</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleApplyManual(pendingAdj, manualIndexValues[f.date] ?? '')}
                      disabled={!manualIndexValues[f.date] || applyingManual[f.date]}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-accent-blue text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
                    >
                      {applyingManual[f.date] ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
                      Aplicar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cards: info del contrato + próximo ajuste */}
      <div className="grid grid-cols-2 gap-4">
        {/* Info contrato */}
        <div className="bg-bg-card border border-border-color rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Home size={13} className="text-accent-blue" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Contrato</span>
          </div>
          <div className="space-y-2">
            <Row label="Inicio" value={format(parseISO(contract.startDate), "d MMM yyyy", { locale: es })} />
            <Row label="Vencimiento" value={endDateFormatted ?? '-'} />
            <Row label="Tiempo restante" value={
              monthsRemaining === null ? '-'
              : monthsRemaining <= 0 ? 'Vencido'
              : monthsRemaining === 1 ? '1 mes'
              : `${monthsRemaining} meses`
            } />
            <Row label="Índice / Frecuencia" value={`${contract.indexType} · ${FREQUENCY_OPTIONS.find(o => o.value === contract.frequencyMonths)?.label.split(' ')[0] ?? `${contract.frequencyMonths} m`}`} />
            <Row label="Monto inicial" value={`$${formatARS(contract.initialAmount)}`} />
          </div>
        </div>

        {/* Próximo ajuste */}
        <div className="bg-bg-card border border-border-color rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Monto actual</span>
          </div>
          <div>
            <p className="text-3xl font-bold text-text-primary tabular-nums">
              ${formatARS(currentAmount)}
            </p>
            <p className="text-xs text-text-secondary mt-1">por mes</p>
          </div>
          <div className="border-t border-border-color pt-3 space-y-2">
            <div>
              <p className="text-xs text-text-secondary">Acumulado pagado hasta hoy</p>
              <p className="text-sm font-semibold text-accent-orange mt-0.5 tabular-nums">
                ${formatARS(accumulatedRent)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Próximo ajuste</p>
              <p className="text-sm font-semibold text-accent-blue mt-0.5">{nextDateFormatted}</p>
            </div>
            {/* Estimación próximo mes */}
            <div>
              <p className="text-xs text-text-secondary">
                {nextEstimate?.kind === 'stable' ? 'Próximo mes (sin ajuste)' : 'Estimación próximo mes'}
              </p>
              {fetchingEstimate ? (
                <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" /> Calculando…
                </p>
              ) : nextEstimate?.kind === 'adjusted' ? (
                <>
                  <p className="text-sm font-semibold text-accent-purple mt-0.5 tabular-nums">
                    ${formatARS(nextEstimate.amount)}
                    <span className="ml-2 text-xs font-medium text-accent-green">
                      +{nextEstimate.pct.toFixed(1)}%
                    </span>
                  </p>
                  <p className="text-xs text-text-secondary/50 mt-0.5">
                    Basado en {contract.indexType} acumulado hasta hoy
                  </p>
                </>
              ) : nextEstimate?.kind === 'stable' ? (
                <>
                  <p className="text-sm font-semibold text-text-primary mt-0.5 tabular-nums">
                    ${formatARS(nextEstimate.amount)}
                  </p>
                  <p className="text-xs text-text-secondary/50 mt-0.5">
                    Sin ajuste previsto el próximo mes
                  </p>
                </>
              ) : nextEstimate?.kind === 'fallback' ? (
                <>
                  <p className="text-sm font-semibold text-text-primary mt-0.5 tabular-nums">
                    ${formatARS(nextEstimate.amount)}
                  </p>
                  <p className="text-xs text-text-secondary/50 mt-0.5 italic">
                    {nextEstimate.reason}
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-bg-card border border-border-color rounded-xl p-5">
        <div className="flex items-center gap-1.5 mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Evolución del alquiler</h3>
          <InfoTooltip
            title="Evolución del Alquiler"
            content="Muestra cómo cambió el valor de tu alquiler en el tiempo.&#10;&#10;• Línea azul: Ajustes registrados&#10;• Línea púrpura: Proyección futura&#10;• Eje Y: Monto del alquiler&#10;• Eje X: Fechas de ajuste&#10;&#10;Actualiza los índices (ICL/IPC) para ver cambios."
          />
        </div>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--color-text-secondary, #6b7280)' }}
                tickFormatter={d => {
                  try { return format(parseISO(d), 'MMM yy', { locale: es }); } catch { return d; }
                }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--color-text-secondary, #6b7280)' }}
                tickFormatter={v => `$${formatARS(v)}`}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine
                x={today}
                stroke="#3b82f6"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{ value: 'Hoy', fontSize: 10, fill: '#3b82f6', position: 'top' }}
              />
              {endDate && (
                <ReferenceLine
                  x={endDate}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  label={{ value: 'Vence', fontSize: 10, fill: '#ef4444', position: 'top' }}
                />
              )}
              <Area
                type="stepAfter"
                dataKey="actualAmount"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#actualGrad)"
                dot={false}
                name="Real"
                connectNulls={false}
                isAnimationActive={false}
              />
              <Area
                type="stepAfter"
                dataKey="projectedAmount"
                stroke="#a855f7"
                strokeWidth={2}
                strokeDasharray="6 3"
                fill="url(#projectedGrad)"
                dot={false}
                name="Proyectado"
                connectNulls={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-text-secondary italic py-6 text-center">
            Registrá al menos un ajuste para ver la evolución.
          </p>
        )}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-accent-blue inline-block rounded" />
            <span className="text-xs text-text-secondary">Real</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-accent-purple inline-block rounded" style={{ borderTop: '2px dashed' }} />
            <span className="text-xs text-text-secondary">Proyectado</span>
          </div>
        </div>
      </div>

      {/* Historial de ajustes */}
      <div className="bg-bg-card border border-border-color rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary">Historial de ajustes</h3>
          {!showAdjustForm && (
            <button
              onClick={() => setShowAdjustForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-blue text-white hover:bg-blue-500 transition-colors"
            >
              <Plus size={12} />
              Registrar ajuste
            </button>
          )}
        </div>

        {contract.adjustments.length === 0 && !showAdjustForm && (
          <p className="text-xs text-text-secondary italic">
            No hay ajustes registrados aún. El primero será el {nextDateFormatted}.
          </p>
        )}

        {contract.adjustments.length > 0 && (
          <div className="rounded-lg border border-border-color/60 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-bg-secondary border-b border-border-color">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-text-secondary">Fecha</th>
                  <th className="text-left px-3 py-2 font-medium text-text-secondary">
                    {contract.indexType === 'IPC' ? 'Variación acumulada' : 'Valor ICL'}
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-text-secondary">Vs. anterior</th>
                  <th className="text-left px-3 py-2 font-medium text-text-secondary">Monto</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {[...contract.adjustments]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((adj, i, arr) => {
                    const prevIndex = i === 0 ? contract.initialIndexValue : arr[i - 1].indexValue;
                    const pct = contract.indexType === 'IPC'
                      ? adj.indexValue.toFixed(1)
                      : (prevIndex > 0 ? ((adj.indexValue / prevIndex - 1) * 100).toFixed(1) : null);
                    return (
                      <tr key={adj.date} className="border-t border-border-color/40 hover:bg-bg-secondary/50">
                        <td className="px-3 py-2 text-text-primary">
                          {format(parseISO(adj.date), "d MMM yyyy", { locale: es })}
                        </td>
                        <td className="px-3 py-2 text-text-secondary tabular-nums">
                          {contract.indexType === 'IPC'
                            ? `+${adj.indexValue.toFixed(1)}%`
                            : adj.indexValue.toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          {pct && <span className="text-accent-green">+{pct}%</span>}
                        </td>
                        <td className="px-3 py-2 font-semibold text-text-primary tabular-nums">
                          ${formatARS(adj.amount)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => handleDeleteAdjustment(adj.date)}
                            className="text-text-secondary hover:text-accent-red transition-colors p-1"
                          >
                            <Trash2 size={11} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {showAdjustForm && (
          <AdjustmentForm
            contract={contract}
            onAdd={handleAddAdjustment}
            onCancel={() => setShowAdjustForm(false)}
          />
        )}
      </div>
    </div>
  );
};

// ── Helper ─────────────────────────────────────────────────────────────────
const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between items-center">
    <span className="text-xs text-text-secondary">{label}</span>
    <span className="text-xs font-medium text-text-primary">{value}</span>
  </div>
);
