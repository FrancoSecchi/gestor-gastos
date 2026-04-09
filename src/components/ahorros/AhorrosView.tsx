import React, { useState } from 'react';
import {
  AreaChart, Area,
  ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { TrendingUp, DollarSign, Percent, Flame, ChevronDown } from 'lucide-react';
import { useAhorros, Rule502030Mapping } from '../../hooks/useAhorros';
import { DollarRate } from '../../types';
import { formatARS } from '../../lib/export';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface AhorrosViewProps {
  dollarRates: DollarRate[];
  dollarLoading: boolean;
  rule502030Mapping: Rule502030Mapping | null;
}

const DOLLAR_LABELS: Record<string, string> = {
  blue: 'Blue',
  oficial: 'Oficial',
  bolsa: 'MEP',
  contadoconliqui: 'CCL',
  tarjeta: 'Tarjeta',
  mayorista: 'Mayorista',
  cripto: 'Cripto',
};

function fmtARS(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${formatARS(n)}`;
}

function fmtUSD(n: number): string {
  return `U$S ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const CustomTooltipAccum = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-card border border-border-color rounded-xl px-3 py-2.5 shadow-xl text-xs space-y-1">
      <p className="font-semibold text-text-primary">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.dataKey === 'cumulativeUsd' ? fmtUSD(p.value) : fmtARS(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

const CustomTooltipMonthly = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-card border border-border-color rounded-xl px-3 py-2.5 shadow-xl text-xs space-y-1">
      <p className="font-semibold text-text-primary">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{fmtARS(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

export const AhorrosView: React.FC<AhorrosViewProps> = ({
  dollarRates,
  dollarLoading,
  rule502030Mapping,
}) => {
  const { data, loading, refresh } = useAhorros(rule502030Mapping);
  const [selectedDollar, setSelectedDollar] = useState<string>('blue');
  const [showDollarMenu, setShowDollarMenu] = useState(false);
  const [showUsd, setShowUsd] = useState(false);

  const currentRate = dollarRates.find(r => r.casa === selectedDollar);
  const arsToUsd = (ars: number) => currentRate ? ars / currentRate.venta : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.monthly.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-accent-green/10 flex items-center justify-center text-2xl">🐷</div>
        <p className="text-sm font-semibold text-text-primary">Sin datos de ahorro</p>
        <p className="text-xs text-text-secondary max-w-xs">
          Registrá transacciones en las categorías <span className="text-text-primary font-medium">Ahorro</span> o <span className="text-text-primary font-medium">Inversión</span> para ver tu evolución aquí.
        </p>
      </div>
    );
  }

  const { monthly, currentMonthData, totalSavings, totalUsd, avgMonthlySavings, avgSavingsRate, bestMonth, streakMonths } = data;
  const currentMonth = currentMonthData;
  // Mes anterior al actual en el array
  const currentIdx = monthly.findIndex(m => m.month === currentMonthData.month);
  const prevMonth = currentIdx > 0 ? monthly[currentIdx - 1] : null;
  const thisMonthVsTarget = currentMonth.income > 0
    ? ((currentMonth.net / (currentMonth.income * 0.2)) * 100)
    : null;

  // Equivalent USD of total ARS savings using selected rate
  const equivalentUsd = arsToUsd(totalSavings);

  // Compliance 50/30/20 stats (computed once, not inside JSX)
  const withIncome = monthly.filter(m => m.income > 0);
  const metTarget = withIncome.filter(m => m.net >= m.target);
  const compliance = withIncome.length > 0 ? (metTarget.length / withIncome.length) * 100 : 0;
  const totalDeficit = withIncome.reduce((acc, m) => acc + Math.max(0, m.target - m.net), 0);
  const projectedAnnual = avgMonthlySavings * 12;
  const avgTarget = withIncome.length > 0
    ? withIncome.reduce((s, m) => s + m.target, 0) / withIncome.length
    : 0;
  const complianceColor = compliance >= 70 ? 'text-accent-green' : compliance >= 40 ? 'text-yellow-400' : 'text-accent-red';

  return (
    <div className="flex flex-col gap-5 animate-fade-in">

      {/* Header row: dollar selector + USD toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">Cotización:</span>
          <div className="relative">
            <button
              onClick={() => setShowDollarMenu(p => !p)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border-color bg-bg-card text-xs font-medium text-text-primary hover:border-accent-blue/40 transition-colors"
            >
              {DOLLAR_LABELS[selectedDollar] ?? selectedDollar}
              {currentRate && (
                <span className="text-text-secondary font-normal">${formatARS(currentRate.venta)}</span>
              )}
              <ChevronDown size={12} className="text-text-secondary" />
            </button>
            {showDollarMenu && (
              <div className="absolute top-full mt-1 left-0 z-20 bg-bg-card border border-border-color rounded-xl shadow-xl py-1 min-w-36">
                {dollarLoading ? (
                  <p className="px-3 py-2 text-xs text-text-secondary">Cargando…</p>
                ) : dollarRates.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-text-secondary">Sin datos</p>
                ) : (
                  dollarRates.map(rate => (
                    <button
                      key={rate.casa}
                      onClick={() => { setSelectedDollar(rate.casa); setShowDollarMenu(false); }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-bg-secondary transition-colors ${selectedDollar === rate.casa ? 'text-accent-blue' : 'text-text-primary'}`}
                    >
                      <span>{DOLLAR_LABELS[rate.casa] ?? rate.casa}</span>
                      <span className="text-text-secondary">${formatARS(rate.venta)}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowUsd(p => !p)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${showUsd ? 'border-accent-blue/40 bg-accent-blue/10 text-accent-blue' : 'border-border-color bg-bg-card text-text-secondary hover:text-text-primary'}`}
        >
          <DollarSign size={12} />
          Ver en USD
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          icon={<span className="text-lg">🐷</span>}
          label="Saldo neto"
          value={showUsd && currentRate ? fmtUSD(equivalentUsd) : `$${formatARS(totalSavings)}`}
          sub={showUsd && currentRate ? `ARS: $${formatARS(totalSavings)}` : (totalUsd > 0 ? `+ ${fmtUSD(totalUsd)} guardados` : undefined)}
          color="green"
        />
        <StatCard
          icon={<TrendingUp size={16} className="text-accent-green" />}
          label="Total depositado"
          value={`$${formatARS(data.totalDeposited)}`}
          sub={`${(data.totalDeposited / (data.totalDeposited + data.totalWithdrawn) * 100).toFixed(0)}% del total`}
          color="green"
        />
        <StatCard
          icon={<span className="text-lg">🏧</span>}
          label="Total retirado"
          value={`$${formatARS(data.totalWithdrawn)}`}
          sub={`${(data.totalWithdrawn / (data.totalDeposited + data.totalWithdrawn) * 100).toFixed(0)}% del total`}
          color="yellow"
        />
        <StatCard
          icon={<Percent size={16} className="text-accent-blue" />}
          label="Tasa de ahorro"
          value={`${avgSavingsRate.toFixed(1)}%`}
          sub="Promedio sobre ingresos"
          color={avgSavingsRate >= 20 ? 'green' : avgSavingsRate >= 10 ? 'yellow' : 'red'}
        />
      </div>

      {/* Second row: insights */}
      <div className="grid grid-cols-3 gap-3">
        <InsightCard
          label="Mes actual"
          value={`$${formatARS(currentMonth.net)}`}
          sub={(() => {
            if (thisMonthVsTarget === null) return 'Sin ingresos registrados';
            const missing = currentMonth.target - currentMonth.net;
            if (missing <= 0) return '✅ Meta alcanzada este mes';
            if (showUsd && currentRate) {
              return `⚠️ Faltan ${fmtUSD(missing / currentRate.venta)} (${fmtARS(missing)})`;
            }
            return `⚠️ Faltan $${formatARS(missing)} para el 20%`;
          })()}
          highlight={thisMonthVsTarget !== null && thisMonthVsTarget >= 100}
        />
        <InsightCard
          label="Mejor mes"
          value={bestMonth ? `$${formatARS(bestMonth.net)}` : '—'}
          sub={bestMonth?.label}
        />
        <InsightCard
          label="Racha actual"
          value={streakMonths > 0 ? `${streakMonths} ${streakMonths === 1 ? 'mes' : 'meses'}` : 'Sin racha'}
          sub={streakMonths > 0 ? 'Meses consecutivos ahorrando' : 'No ahorraste el último mes'}
          icon={streakMonths > 2 ? <Flame size={14} className="text-orange-400" /> : undefined}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Chart 1: Evolución acumulada */}
        <div className="bg-bg-card border border-border-color rounded-2xl p-4">
          <div className="mb-3">
            <p className="text-sm font-semibold text-text-primary">Evolución acumulada</p>
            <p className="text-xs text-text-secondary mt-0.5">Ahorro total histórico en ARS</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => fmtARS(v)}
                width={50}
              />
              <Tooltip content={CustomTooltipAccum} />
              <Area
                type="monotone"
                dataKey="cumulative"
                name="ARS acumulado"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gradGreen)"
                dot={false}
                activeDot={{ r: 4, fill: '#10b981' }}
                isAnimationActive={false}
              />
              {monthly.some(m => m.cumulativeUsd > 0) && (
                <Area
                  type="monotone"
                  dataKey="cumulativeUsd"
                  name="USD acumulado"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  fill="url(#gradBlue)"
                  dot={false}
                  activeDot={{ r: 3, fill: '#3b82f6' }}
                  yAxisId={0}
                  isAnimationActive={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Ahorro mensual vs meta 20% */}
        <div className="bg-bg-card border border-border-color rounded-2xl p-4">
          <div className="mb-3">
            <p className="text-sm font-semibold text-text-primary">Ahorro mensual vs meta 20%</p>
            <p className="text-xs text-text-secondary mt-0.5">Ahorro neto vs mínimo recomendado por mes</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => fmtARS(v)}
                width={50}
              />
              <Tooltip content={CustomTooltipMonthly} />
              <Legend
                wrapperStyle={{ fontSize: 10, color: '#6b7280', paddingTop: 8 }}
                formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 10 }}>{value}</span>}
              />
              <Bar
                dataKey="net"
                name="Ahorro neto"
                fill="#10b981"
                opacity={0.85}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="target"
                name="Meta 20%"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                activeDot={{ r: 3, fill: '#f59e0b' }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 50/30/20 compliance stats */}
      <div className="bg-bg-card border border-border-color rounded-2xl p-4">
        <div className="mb-3">
          <p className="text-sm font-semibold text-text-primary">Cumplimiento 50/30/20</p>
          <p className="text-xs text-text-secondary mt-0.5">Qué tan seguido alcanzás el 20% de ahorro recomendado</p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-xl border border-border-color bg-bg-secondary px-4 py-3 flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Meses en meta</p>
            <p className={`text-base font-bold tabular-nums ${complianceColor}`}>{metTarget.length} / {withIncome.length}</p>
            <p className="text-[11px] text-text-secondary">{compliance.toFixed(0)}% de cumplimiento</p>
          </div>
          <div className="rounded-xl border border-border-color bg-bg-secondary px-4 py-3 flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Meta promedio</p>
            <p className="text-base font-bold tabular-nums text-yellow-400">{fmtARS(avgTarget)}</p>
            <p className="text-[11px] text-text-secondary">20% del ingreso promedio</p>
          </div>
          <div className="rounded-xl border border-border-color bg-bg-secondary px-4 py-3 flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Déficit acumulado</p>
            <p className="text-base font-bold tabular-nums text-accent-red">{fmtARS(totalDeficit)}</p>
            <p className="text-[11px] text-text-secondary">Suma de meses bajo meta</p>
          </div>
          <div className="rounded-xl border border-border-color bg-bg-secondary px-4 py-3 flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Proyección anual</p>
            <p className={`text-base font-bold tabular-nums ${projectedAnnual >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>{fmtARS(projectedAnnual)}</p>
            <p className="text-[11px] text-text-secondary">Al ritmo promedio actual</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-text-secondary mb-1">
            <span>Cumplimiento histórico</span>
            <span>{compliance.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full ${compliance >= 70 ? 'bg-accent-green' : compliance >= 40 ? 'bg-yellow-400' : 'bg-accent-red'}`}
              style={{ width: `${Math.min(compliance, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Savings movements list */}
      {data.movements && data.movements.length > 0 && (
        <div className="bg-bg-card border border-border-color rounded-2xl p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-text-primary">Historial de movimientos</p>
            <p className="text-xs text-text-secondary mt-0.5">{data.movements.length} movimiento{data.movements.length !== 1 ? 's' : ''} registrado{data.movements.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.movements.map((tx) => (
              
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-xl bg-bg-secondary border border-border-color/50 hover:border-border-color transition-all duration-150"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-lg
                    ${tx.subtype === 'transfer_to_savings'
                      ? 'bg-accent-green/15 text-accent-green'
                      : 'bg-yellow-500/15 text-yellow-600'
                    }
                  `}>
                    {tx.subtype === 'transfer_to_savings' ? '→' : '←'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary">
                      {tx.subtype === 'transfer_to_savings' ? 'Depósito' : 'Retiro'}
                      {tx.description ? ` · ${tx.description}` : ''}
                    </p>
                    <p className="text-[10px] text-text-secondary">
                      {format(parseISO(tx.date), 'dd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className={`text-sm font-bold tabular-nums ${
                    tx.subtype === 'transfer_to_savings' ? 'text-accent-green' : 'text-yellow-600'
                  }`}>
                    {tx.subtype === 'transfer_to_savings' ? '+' : '-'}${formatARS(tx.amount)}
                  </p>
                  {tx.amount_usd && (
                    <p className="text-[10px] text-text-secondary tabular-nums">
                      U$S ${tx.amount_usd.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: 'green' | 'blue' | 'yellow' | 'red';
}

const COLOR_MAP = {
  green: 'text-accent-green',
  blue: 'text-accent-blue',
  yellow: 'text-yellow-400',
  red: 'text-accent-red',
};

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, sub, color }) => (
  <div className="bg-bg-card border border-border-color rounded-2xl p-4 flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-bg-secondary flex items-center justify-center">{icon}</div>
      <span className="text-xs text-text-secondary">{label}</span>
    </div>
    <p className={`text-xl font-bold tabular-nums ${COLOR_MAP[color]}`}>{value}</p>
    {sub && <p className="text-[11px] text-text-secondary leading-tight">{sub}</p>}
  </div>
);

interface InsightCardProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}

const InsightCard: React.FC<InsightCardProps> = ({ label, value, sub, highlight, icon }) => (
  <div className={`rounded-xl border px-4 py-3 flex flex-col gap-1 ${highlight ? 'border-accent-green/30 bg-accent-green/5' : 'border-border-color bg-bg-card'}`}>
    <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">{label}</p>
    <div className="flex items-center gap-1.5">
      {icon}
      <p className={`text-base font-bold tabular-nums ${highlight ? 'text-accent-green' : 'text-text-primary'}`}>{value}</p>
    </div>
    {sub && <p className="text-[11px] text-text-secondary">{sub}</p>}
  </div>
);
