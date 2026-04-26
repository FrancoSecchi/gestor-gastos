import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
  Plus, RefreshCw, Trash2, Pencil, TrendingUp, TrendingDown,
  DollarSign, BarChart2, Info,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useInvestments } from '../../hooks/useInvestments';
import { useStockPrices } from '../../hooks/useStockPrices';
import { enrichPositions, buildCumulativeCapital } from '../../lib/investments';
import { InvestmentForm } from './InvestmentForm';
import { AssetPriceChart } from './AssetPriceChart';
import { HistoricalPricesChart } from './HistoricalPricesChart';
import { InfoTooltip } from '../ui/InfoTooltip';
import { InvestmentMovement, Position } from '../../types/investments';

// ─── Formatting ──────────────────────────────────────────────────────────────

function fmtUSD(n: number, decimals = 2): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const TICKER_COLORS: Record<string, string> = {
  SPY: '#3b82f6',
  QQQ: '#8b5cf6',
  AAPL: '#6b7280',
  GOOGL: '#10b981',
  MSFT: '#0ea5e9',
  AMZN: '#f59e0b',
  MELI: '#22c55e',
  TSLA: '#ef4444',
  NVDA: '#a855f7',
};

function tickerColor(ticker: string): string {
  if (TICKER_COLORS[ticker]) return TICKER_COLORS[ticker];
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = ticker.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360}, 42%, 52%)`;
}

// ─── Tooltip content for InfoTooltip ────────────────────────────────────────

const TOOLTIP_CONTENT = (
  <div className="space-y-3">
    <div>
      <p className="font-semibold text-text-primary mb-1">Activos disponibles</p>
      <p>
        La lista de activos es fija: <span className="text-text-primary font-medium">SPY, QQQ, AAPL, GOOGL, MSFT, AMZN, MELI, TSLA y NVDA</span>.
        Se populan automáticamente al iniciar la app. No se pueden agregar tickers arbitrarios desde la UI.
      </p>
    </div>
    <div>
      <p className="font-semibold text-text-primary mb-1">Precios en tiempo real</p>
      <p>
        Los precios se obtienen de <span className="text-text-primary font-medium">Yahoo Finance</span> al montar la sección y se actualizan cada
        60 segundos. Si un ticker falla, se muestra el último precio conocido o "—".
      </p>
    </div>
    <div>
      <p className="font-semibold text-text-primary mb-1">Operaciones</p>
      <p>
        Registrá compras y ventas para calcular tu posición actual, precio promedio ponderado y ganancia/pérdida.
        Una venta no puede superar tu posición actual en ese activo.
      </p>
    </div>
    <div>
      <p className="font-semibold text-text-primary mb-1">Gráficos</p>
      <ul className="space-y-0.5 pl-2">
        <li><span className="text-text-primary font-medium">Pie</span> — distribución % del portafolio por activo (solo posiciones con precio disponible).</li>
        <li><span className="text-text-primary font-medium">Línea</span> — evolución del capital neto invertido acumulado en el tiempo.</li>
        <li><span className="text-text-primary font-medium">Barras</span> — P&L % por activo, verde = ganancia, rojo = pérdida.</li>
      </ul>
    </div>
  </div>
);

// ─── Main view ───────────────────────────────────────────────────────────────

export const InvestmentsView: React.FC = () => {
  const { assets, movements, positions, loading, addMovement, removeMovement, editMovement } = useInvestments();
  const tickers = useMemo(() => assets.map(a => a.ticker), [assets]);
  const { prices, loading: pricesLoading, refresh: refreshPrices } = useStockPrices(tickers);
  const [showForm, setShowForm] = useState(false);
  const [editingMovement, setEditingMovement] = useState<InvestmentMovement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const enriched: Position[] = useMemo(() => enrichPositions(positions, prices), [positions, prices]);

  const totalValueUsd = enriched.reduce((s, p) => s + (p.currentValueUsd ?? 0), 0);
  const totalInvestedUsd = enriched.reduce((s, p) => s + p.investedUsd, 0);
  const totalPnlUsd = enriched.every(p => p.currentValueUsd != null)
    ? totalValueUsd - totalInvestedUsd
    : null;
  const totalPnlPct = totalPnlUsd != null && totalInvestedUsd > 0
    ? (totalPnlUsd / totalInvestedUsd) * 100
    : null;

  // Chart data
  const pieData = enriched
    .filter(p => p.currentValueUsd != null && p.currentValueUsd > 0)
    .map(p => ({ name: p.ticker, value: p.currentValueUsd!, color: tickerColor(p.ticker) }));

  const barData = enriched
    .filter(p => p.pnlPct != null)
    .map(p => ({ ticker: p.ticker, pct: p.pnlPct!, color: (p.pnlPct ?? 0) >= 0 ? '#10b981' : '#ef4444' }))
    .sort((a, b) => b.pct - a.pct);

  const lineData = useMemo(() => buildCumulativeCapital(movements), [movements]);
  const lineChartData = lineData.map(d => ({
    label: format(parseISO(d.date), 'dd MMM yy', { locale: es }),
    invested: d.invested,
  }));

  // Tickers that have at least one registered movement (sorted for stable order)
  const tickersWithMovements = useMemo(
    () => [...new Set(movements.map(m => m.ticker))].sort(),
    [movements]
  );

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Seguro que querés eliminar este movimiento?')) return;
    setDeletingId(id);
    try {
      await removeMovement(id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (m: InvestmentMovement) => {
    setEditingMovement(m);
  };

  const handleEditSave = async (data: Parameters<typeof addMovement>[0]) => {
    if (!editingMovement) return;
    await editMovement(editingMovement.id, data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in">

      {/* ── Info banner ─────────────────────────────────────────── */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-accent-blue/20 bg-accent-blue/5">
        <Info size={14} className="text-accent-blue flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-secondary leading-relaxed">
            Seguimiento de portafolio para{' '}
            <span className="text-text-primary font-medium">SPY, QQQ, AAPL, GOOGL, MSFT, AMZN, MELI, TSLA y NVDA</span>.
            Precios en tiempo real vía Yahoo Finance, actualizados cada 60 segundos.
            Si un ticker falla, se muestra el último precio conocido o —.
          </p>
        </div>
        <InfoTooltip title="¿Cómo funciona Inversiones?" content={TOOLTIP_CONTENT} />
      </div>

      {/* ── Summary cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          icon={<DollarSign size={15} className="text-accent-blue" />}
          label="Valor del portafolio"
          value={enriched.some(p => p.currentValueUsd != null) ? fmtUSD(totalValueUsd) : '—'}
          sub="Precio actual × cantidad"
          color="blue"
        />
        <SummaryCard
          icon={<BarChart2 size={15} className="text-text-secondary" />}
          label="Capital invertido"
          value={totalInvestedUsd > 0 ? fmtUSD(totalInvestedUsd) : '—'}
          sub="Costo base ponderado"
          color="neutral"
        />
        <SummaryCard
          icon={
            totalPnlUsd != null && totalPnlUsd >= 0
              ? <TrendingUp size={15} className="text-accent-green" />
              : <TrendingDown size={15} className="text-accent-red" />
          }
          label="Ganancia / Pérdida"
          value={totalPnlUsd != null ? fmtUSD(totalPnlUsd) : '—'}
          sub={totalPnlPct != null ? fmtPct(totalPnlPct) : undefined}
          color={totalPnlUsd == null ? 'neutral' : totalPnlUsd >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* ── Header: action buttons ───────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Posiciones actuales</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshPrices}
            disabled={pricesLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-color text-xs text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={pricesLoading ? 'animate-spin' : ''} />
            Actualizar precios
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue/15 border border-accent-blue/25 text-xs text-accent-blue font-medium hover:bg-accent-blue/25 transition-colors"
          >
            <Plus size={12} />
            Registrar operación
          </button>
        </div>
      </div>

      {/* ── Positions table ──────────────────────────────────────── */}
      {enriched.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center bg-bg-card border border-border-color rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-accent-blue/10 flex items-center justify-center">
            <BarChart2 size={22} className="text-accent-blue" />
          </div>
          <p className="text-sm font-semibold text-text-primary">Sin posiciones</p>
          <p className="text-xs text-text-secondary max-w-xs">
            Registrá tu primera compra para ver las posiciones, el P&L y los gráficos.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-1 px-4 py-2 rounded-xl bg-accent-blue/15 border border-accent-blue/25 text-sm text-accent-blue font-medium hover:bg-accent-blue/25 transition-colors"
          >
            Registrar compra
          </button>
        </div>
      ) : (
        <div className="bg-bg-card border border-border-color rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-color/50">
                  {['Activo', 'Cantidad', 'Precio promedio', 'Precio actual', 'Valor actual', 'P&L USD', 'P&L %'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-wider font-semibold text-text-secondary whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enriched.map((pos, i) => {
                  const positive = (pos.pnlUsd ?? 0) >= 0;
                  return (
                    <tr
                      key={pos.ticker}
                      className={`border-b border-border-color/30 hover:bg-bg-secondary/50 transition-colors ${i === enriched.length - 1 ? 'border-b-0' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tickerColor(pos.ticker) }}
                          />
                          <span className="font-semibold text-text-primary">{pos.ticker}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-text-primary">{pos.qty.toFixed(4)}</td>
                      <td className="px-4 py-3 tabular-nums text-text-secondary">{fmtUSD(pos.avgBuyPrice)}</td>
                      <td className="px-4 py-3 tabular-nums text-text-primary">
                        {pos.currentPrice != null ? fmtUSD(pos.currentPrice) : '—'}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-medium text-text-primary">
                        {pos.currentValueUsd != null ? fmtUSD(pos.currentValueUsd) : '—'}
                      </td>
                      <td className={`px-4 py-3 tabular-nums font-medium ${pos.pnlUsd == null ? 'text-text-secondary' : positive ? 'text-accent-green' : 'text-accent-red'}`}>
                        {pos.pnlUsd != null ? (positive ? '+' : '') + fmtUSD(pos.pnlUsd) : '—'}
                      </td>
                      <td className={`px-4 py-3 tabular-nums font-medium ${pos.pnlPct == null ? 'text-text-secondary' : positive ? 'text-accent-green' : 'text-accent-red'}`}>
                        {pos.pnlPct != null ? fmtPct(pos.pnlPct) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Charts ──────────────────────────────────────────────── */}
      {(pieData.length > 0 || lineChartData.length > 0 || barData.length > 0) && (
        <>
          <div className="grid grid-cols-2 gap-4">
            {/* Pie: portfolio distribution */}
            {pieData.length > 0 && (
              <div className="bg-bg-card border border-border-color rounded-2xl p-4">
                <p className="text-sm font-semibold text-text-primary mb-1">Distribución del portafolio</p>
                <p className="text-xs text-text-secondary mb-4">% del valor total por activo</p>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={72}
                        paddingAngle={2}
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {pieData.map(entry => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          const pct = ((d.value / totalValueUsd) * 100).toFixed(1);
                          return (
                            <div className="bg-bg-card border border-border-color rounded-xl px-3 py-2 shadow-xl text-xs">
                              <p className="font-semibold text-text-primary">{d.name}</p>
                              <p className="text-text-secondary">{fmtUSD(d.value)} · {pct}%</p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    {pieData.map(d => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-[11px] text-text-primary font-medium">{d.name}</span>
                        <span className="text-[11px] text-text-secondary ml-auto tabular-nums">
                          {((d.value / totalValueUsd) * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Bar: P&L % per asset */}
            {barData.length > 0 && (
              <div className="bg-bg-card border border-border-color rounded-2xl p-4">
                <p className="text-sm font-semibold text-text-primary mb-1">Rendimiento por activo</p>
                <p className="text-xs text-text-secondary mb-4">P&L % sobre capital invertido</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    data={barData}
                    layout="vertical"
                    margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: '#6b7280', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(0)}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="ticker"
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={38}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-bg-card border border-border-color rounded-xl px-3 py-2 shadow-xl text-xs">
                            <p className="font-semibold text-text-primary">{d.ticker}</p>
                            <p style={{ color: d.color }}>{fmtPct(d.pct)}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="pct" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                      {barData.map(entry => (
                        <Cell key={entry.ticker} fill={entry.color} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Line: cumulative invested capital */}
          {lineChartData.length > 1 && (
            <div className="bg-bg-card border border-border-color rounded-2xl p-4">
              <p className="text-sm font-semibold text-text-primary mb-1">Capital neto invertido</p>
              <p className="text-xs text-text-secondary mb-4">Evolución acumulada en el tiempo (compras − ventas)</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={lineChartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}`}
                    width={50}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-bg-card border border-border-color rounded-xl px-3 py-2 shadow-xl text-xs">
                          <p className="font-semibold text-text-primary mb-1">{label}</p>
                          <p className="text-accent-blue">Capital: <span className="font-bold">{fmtUSD(payload[0].value as number)}</span></p>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="invested"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#3b82f6' }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* ── Market price history ─────────────────────────────────── */}
      <HistoricalPricesChart />

      {/* ── Historical price charts ──────────────────────────────── */}
      {tickersWithMovements.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-text-primary">Precio histórico por activo</h2>
          {tickersWithMovements.map(ticker => (
            <AssetPriceChart
              key={ticker}
              ticker={ticker}
              color={tickerColor(ticker)}
              movements={movements.filter(m => m.ticker === ticker)}
            />
          ))}
        </div>
      )}

      {/* ── Movements history ────────────────────────────────────── */}
      {movements.length > 0 && (
        <div className="bg-bg-card border border-border-color rounded-2xl p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-text-primary">Historial de operaciones</p>
            <p className="text-xs text-text-secondary mt-0.5">{movements.length} operación{movements.length !== 1 ? 'es' : ''} registrada{movements.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {movements.map(m => {
              const isBuy = m.type === 'buy';
              const total = m.quantity * m.price_usd;
              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-bg-secondary border border-border-color/50 hover:border-border-color transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isBuy ? 'bg-accent-green/15 text-accent-green' : 'bg-accent-red/15 text-accent-red'}`}>
                      {isBuy ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-text-primary">
                        {isBuy ? 'Compra' : 'Venta'}{' '}
                        <span style={{ color: tickerColor(m.ticker) }}>{m.ticker}</span>
                        {m.notes ? <span className="font-normal text-text-secondary"> · {m.notes}</span> : null}
                      </p>
                      <p className="text-[10px] text-text-secondary">
                        {format(parseISO(m.date), 'dd MMM yyyy', { locale: es })}
                        {' · '}{m.quantity.toFixed(4)} u. @ {fmtUSD(m.price_usd)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    <p className={`text-sm font-bold tabular-nums ${isBuy ? 'text-accent-green' : 'text-accent-red'}`}>
                      {isBuy ? '+' : '-'}{fmtUSD(total)}
                    </p>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(m)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-text-secondary hover:text-accent-blue hover:bg-accent-blue/10 transition-colors"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        disabled={deletingId === m.id}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-colors disabled:opacity-30"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Form modal ───────────────────────────────────────────── */}
      {showForm && (
        <InvestmentForm
          assets={assets}
          prices={prices}
          positions={enriched}
          onSave={addMovement}
          onClose={() => setShowForm(false)}
        />
      )}
      {editingMovement && (
        <InvestmentForm
          assets={assets}
          prices={prices}
          positions={enriched}
          initialData={editingMovement}
          onSave={handleEditSave}
          onClose={() => setEditingMovement(null)}
        />
      )}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: 'green' | 'red' | 'blue' | 'neutral';
}

const COLOR_TEXT: Record<SummaryCardProps['color'], string> = {
  green: 'text-accent-green',
  red: 'text-accent-red',
  blue: 'text-accent-blue',
  neutral: 'text-text-primary',
};

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, label, value, sub, color }) => (
  <div className="bg-bg-card border border-border-color rounded-2xl p-4 flex flex-col gap-2">
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-bg-secondary flex items-center justify-center">{icon}</div>
      <span className="text-xs text-text-secondary">{label}</span>
    </div>
    <p className={`text-xl font-bold tabular-nums ${COLOR_TEXT[color]}`}>{value}</p>
    {sub && <p className="text-[11px] text-text-secondary">{sub}</p>}
  </div>
);
