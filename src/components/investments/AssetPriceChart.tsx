import React, { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { InvestmentMovement } from '../../types/investments';

// ─── Types ────────────────────────────────────────────────────────────────────

type PriceRange = '1m' | '3m' | '6m' | '1y';

interface OpEntry {
  type: 'buy' | 'sell';
  quantity: number;
  price_usd: number;
  notes: string | null;
}

interface ChartPoint {
  date: string;
  close: number;
  ops: OpEntry[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RANGE_API: Record<PriceRange, string> = {
  '1m': '1mo',
  '3m': '3mo',
  '6m': '6mo',
  '1y': '1y',
};

const RANGE_LABELS: Record<PriceRange, string> = {
  '1m': '1M',
  '3m': '3M',
  '6m': '6M',
  '1y': '1A',
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchHistory(ticker: string, range: PriceRange): Promise<ChartPoint[]> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=${RANGE_API[range]}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error('Respuesta inesperada del servidor');

  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];

  return timestamps
    .map((ts, i) => ({
      date: format(new Date(ts * 1000), 'yyyy-MM-dd'),
      close: closes[i] ?? 0,
      ops: [],
    }))
    .filter(p => p.close > 0);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AssetPriceChartProps {
  ticker: string;
  color: string;
  movements: InvestmentMovement[];
}

export const AssetPriceChart: React.FC<AssetPriceChartProps> = ({ ticker, color, movements }) => {
  const [range, setRange] = useState<PriceRange>('1y');
  const [rawData, setRawData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchHistory(ticker, range)
      .then(data => { if (!cancelled) setRawData(data); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Error'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [ticker, range]);

  // Map movements by date for O(1) lookup
  const opsByDate = useMemo<Record<string, OpEntry[]>>(() => {
    const map: Record<string, OpEntry[]> = {};
    for (const m of movements) {
      if (!map[m.date]) map[m.date] = [];
      map[m.date].push({ type: m.type, quantity: m.quantity, price_usd: m.price_usd, notes: m.notes });
    }
    return map;
  }, [movements]);

  // Merge ops into chart data
  const chartData = useMemo<ChartPoint[]>(
    () => rawData.map(p => ({ ...p, ops: opsByDate[p.date] ?? [] })),
    [rawData, opsByDate]
  );

  // Only op dates that are within the fetched range (so ReferenceLine has a matching x value)
  const opDatesInRange = useMemo(
    () =>
      Object.entries(opsByDate)
        .filter(([date]) => chartData.some(p => p.date === date))
        .map(([date, ops]) => ({ date, ops })),
    [opsByDate, chartData]
  );

  const hasAnyOps = opDatesInRange.length > 0;
  const hasMixedOps = opDatesInRange.some(d => d.ops.some(o => o.type === 'buy') && d.ops.some(o => o.type === 'sell'));

  // Y domain with 5% padding
  const { yMin, yMax } = useMemo(() => {
    if (chartData.length === 0) return { yMin: 0, yMax: 100 };
    const closes = chartData.map(p => p.close);
    const mn = Math.min(...closes);
    const mx = Math.max(...closes);
    const pad = (mx - mn) * 0.06;
    return { yMin: mn - pad, yMax: mx + pad };
  }, [chartData]);

  const tickInterval = Math.max(0, Math.floor(chartData.length / 6) - 1);

  return (
    <div className="bg-bg-card border border-border-color rounded-2xl p-4">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <p className="text-sm font-semibold text-text-primary">{ticker}</p>
          <span className="text-xs text-text-secondary">· Precio histórico</span>
        </div>

        {/* Range selector */}
        <div className="flex rounded-lg border border-border-color overflow-hidden">
          {(Object.keys(RANGE_LABELS) as PriceRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 text-[11px] font-medium border-r border-border-color last:border-r-0 transition-colors ${
                range === r
                  ? 'bg-accent-blue/15 text-accent-blue'
                  : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart area ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-5 h-5 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
          <p className="text-xs text-text-secondary">No se pudo cargar el historial de {ticker}.</p>
          <p className="text-[10px] text-text-secondary/50">{error}</p>
          <button
            onClick={() => setRange(r => r)}
            className="text-[11px] px-3 py-1 rounded-lg border border-border-color text-text-secondary hover:text-text-primary transition-colors mt-1"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />

            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={tickInterval}
              tickFormatter={d => {
                try { return format(new Date(d + 'T12:00:00'), 'MMM yy', { locale: es }); }
                catch { return d; }
              }}
            />

            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v =>
                v >= 1000
                  ? `$${(v / 1000).toFixed(1)}k`
                  : `$${v.toFixed(0)}`
              }
              width={52}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as ChartPoint;
                return (
                  <div className="bg-bg-card border border-border-color rounded-xl px-3 py-2.5 shadow-xl text-xs space-y-1.5 min-w-36">
                    <p className="font-semibold text-text-primary">
                      {format(new Date(point.date + 'T12:00:00'), "dd 'de' MMM yyyy", { locale: es })}
                    </p>
                    <p className="text-text-secondary">
                      Cierre:{' '}
                      <span className="font-bold text-text-primary tabular-nums">
                        ${point.close.toFixed(2)}
                      </span>
                    </p>
                    {point.ops.map((op, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-1.5 pt-0.5 ${
                          op.type === 'buy' ? 'text-accent-green' : 'text-accent-red'
                        }`}
                      >
                        {op.type === 'buy' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        <span className="font-medium">{op.type === 'buy' ? 'Compra' : 'Venta'}</span>
                        <span className="text-[10px] opacity-75 tabular-nums">
                          {op.quantity.toFixed(4)} u. @ ${op.price_usd.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />

            {/* Vertical reference lines at operation dates */}
            {opDatesInRange.map(({ date, ops }) => {
              const hasBuy = ops.some(o => o.type === 'buy');
              const hasSell = ops.some(o => o.type === 'sell');
              const stroke =
                hasBuy && hasSell ? '#f59e0b' : hasBuy ? '#10b981' : '#ef4444';
              return (
                <ReferenceLine
                  key={date}
                  x={date}
                  stroke={stroke}
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  strokeOpacity={0.65}
                />
              );
            })}

            {/* Price line with highlighted dots at operation dates */}
            <Line
              type="monotone"
              dataKey="close"
              stroke={color}
              strokeWidth={1.5}
              dot={(props: any) => {
                const { cx, cy, payload } = props as { cx: number; cy: number; payload: ChartPoint };
                if (!payload.ops?.length) return <g key={`empty-${payload.date}`} />;
                const hasBuy = payload.ops.some(o => o.type === 'buy');
                const hasSell = payload.ops.some(o => o.type === 'sell');
                const fill =
                  hasBuy && hasSell ? '#f59e0b' : hasBuy ? '#10b981' : '#ef4444';
                return (
                  <circle
                    key={`dot-${payload.date}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={fill}
                    stroke="#0f1117"
                    strokeWidth={1.5}
                  />
                );
              }}
              activeDot={{ r: 4, fill: color, stroke: '#0f1117', strokeWidth: 1.5 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* ── Legend for operation markers ───────────────────────────── */}
      {hasAnyOps && !loading && !error && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border-color/30">
          <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider">
            Operaciones:
          </span>
          {opDatesInRange.some(d => d.ops.some(o => o.type === 'buy')) && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-px bg-accent-green" style={{ borderTop: '2px dashed #10b981' }} />
              <TrendingUp size={10} className="text-accent-green" />
              <span className="text-[10px] text-text-secondary">Compra</span>
            </div>
          )}
          {opDatesInRange.some(d => d.ops.some(o => o.type === 'sell')) && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-px" style={{ borderTop: '2px dashed #ef4444' }} />
              <TrendingDown size={10} className="text-accent-red" />
              <span className="text-[10px] text-text-secondary">Venta</span>
            </div>
          )}
          {hasMixedOps && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-px" style={{ borderTop: '2px dashed #f59e0b' }} />
              <span className="text-[10px] text-text-secondary">Ambas</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
