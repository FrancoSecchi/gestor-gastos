import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useHistoricalPrices, Range } from '../../hooks/useHistoricalPrices';

const TICKERS = ['SPY', 'QQQ', 'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'MELI', 'TSLA', 'NVDA'] as const;

const RANGES: { value: Range; label: string }[] = [
  { value: '1mo', label: '1M' },
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1A' },
  { value: '2y', label: '2A' },
  { value: 'max', label: 'Máx' },
];

const TICKER_COLORS: Record<string, string> = {
  SPY: '#3b82f6',
  QQQ: '#8b5cf6',
  AAPL: '#9ca3af',
  GOOGL: '#10b981',
  MSFT: '#0ea5e9',
  AMZN: '#f59e0b',
  MELI: '#22c55e',
  TSLA: '#ef4444',
  NVDA: '#a855f7',
};

function fmtUSD(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function formatXLabel(dateStr: string, range: Range): string {
  const d = parseISO(dateStr);
  if (range === '1mo') return format(d, 'd MMM', { locale: es });
  if (range === '3mo' || range === '6mo') return format(d, 'MMM yy', { locale: es });
  return format(d, 'MMM yy', { locale: es });
}

export const HistoricalPricesChart: React.FC = () => {
  const [ticker, setTicker] = useState<string>('SPY');
  const [range, setRange] = useState<Range>('1y');

  const { data, loading, error, retry } = useHistoricalPrices(ticker, range);

  const color = TICKER_COLORS[ticker] ?? '#3b82f6';

  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    const basePrice = data[0].close;
    return data.map(p => ({
      date: p.date,
      close: p.close,
      pctChange: ((p.close - basePrice) / basePrice) * 100,
    }));
  }, [data]);

  const firstClose = chartData[0]?.close ?? null;
  const lastClose = chartData[chartData.length - 1]?.close ?? null;
  const pctChange = firstClose != null && lastClose != null
    ? ((lastClose - firstClose) / firstClose) * 100
    : null;
  const positive = pctChange == null || pctChange >= 0;

  // Reduce X-axis ticks to avoid clutter
  const tickIndexes = useMemo(() => {
    if (chartData.length === 0) return [];
    const count = range === '1mo' ? 5 : range === '3mo' ? 6 : 8;
    const step = Math.floor(chartData.length / count);
    const result: number[] = [];
    for (let i = 0; i < chartData.length; i += step) result.push(i);
    if (result[result.length - 1] !== chartData.length - 1) result.push(chartData.length - 1);
    return result;
  }, [chartData, range]);

  const ticks = tickIndexes.map(i => chartData[i]?.date).filter(Boolean);

  return (
    <div className="bg-bg-card border border-border-color rounded-2xl p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">Precio histórico</p>
          <p className="text-xs text-text-secondary mt-0.5">Cierre diario vía Yahoo Finance</p>
        </div>
        {pctChange != null && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold ${positive ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'}`}>
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {fmtPct(pctChange)}
          </div>
        )}
      </div>

      {/* Ticker selector */}
      <div className="flex flex-wrap gap-1.5">
        {TICKERS.map(t => {
          const active = t === ticker;
          const c = TICKER_COLORS[t];
          return (
            <button
              key={t}
              onClick={() => setTicker(t)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                active
                  ? 'border-transparent text-white'
                  : 'border-border-color text-text-secondary hover:text-text-primary hover:border-border-color/80'
              }`}
              style={active ? { backgroundColor: c, borderColor: c } : undefined}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Range selector */}
      <div className="flex items-center gap-1">
        {RANGES.map(r => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all ${
              range === r.value
                ? 'bg-bg-secondary text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div className="h-56 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <RefreshCw size={13} className="animate-spin" />
              Cargando…
            </div>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <p className="text-xs text-accent-red">{error}</p>
            <button
              onClick={retry}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-color text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              <RefreshCw size={11} />
              Reintentar
            </button>
          </div>
        )}
        {!loading && !error && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                ticks={ticks}
                tickFormatter={d => formatXLabel(d, range)}
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`}
                width={52}
              />
              <ReferenceLine y={firstClose ?? 0} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  const pct = d.pctChange as number;
                  return (
                    <div className="bg-bg-card border border-border-color rounded-xl px-3 py-2 shadow-xl text-xs">
                      <p className="text-text-secondary mb-1">
                        {label ? format(parseISO(label), 'dd MMM yyyy', { locale: es }) : ''}
                      </p>
                      <p className="font-semibold text-text-primary">{fmtUSD(d.close)}</p>
                      <p style={{ color: pct >= 0 ? '#10b981' : '#ef4444' }}>
                        {fmtPct(pct)} vs inicio
                      </p>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="close"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: color }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer: price info */}
      {!loading && !error && lastClose != null && (
        <div className="flex items-center justify-between pt-1 border-t border-border-color/30">
          <span className="text-[11px] text-text-secondary">{ticker} · último cierre</span>
          <span className="text-sm font-bold tabular-nums" style={{ color }}>{fmtUSD(lastClose)}</span>
        </div>
      )}
    </div>
  );
};
