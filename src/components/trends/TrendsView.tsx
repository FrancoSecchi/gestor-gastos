import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Rule502030Mapping } from '../../lib/budgetRuleMapping';
import { Rule502030Group, getCategoryColor } from '../../types';
import { useHistoricalData } from '../../hooks/useHistoricalData';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';

interface TrendsViewProps {
  mapping: Rule502030Mapping;
}

const GROUP_COLORS: Record<Rule502030Group, string> = {
  'Necesidades': '#3b82f6',
  'Deseos': '#a855f7',
  'Ahorro/Inversión': '#22c55e',
};

const axisStyle = { fill: '#94a3b8', fontSize: 10 };
const gridStyle = { stroke: '#2d3148', strokeDasharray: '3 3' };
const MAX_CATEGORY_LINES = 5;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-text-primary mb-3">{children}</h3>
  );
}

function EmptyState() {
  return (
    <div className="h-48 flex flex-col items-center justify-center gap-2 text-text-secondary">
      <span className="text-2xl opacity-40">📊</span>
      <p className="text-xs">Sin datos suficientes para mostrar</p>
    </div>
  );
}

function ChartCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-border-color rounded-xl p-4">
      {children}
    </div>
  );
}

export const TrendsView: React.FC<TrendsViewProps> = ({ mapping }) => {
  const { fmt } = useCurrencyFormat();
  const [months, setMonths] = useState<6 | 12>(6);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const { data, categories, loading } = useHistoricalData(months, mapping);

  const hasData = data.some(d => d.income > 0 || d.expenses > 0);

  const visibleCategories = useMemo(() => {
    if (selectedCategories.length > 0) return selectedCategories;
    // Default: top 5 by total spend
    return [...categories]
      .sort((a, b) => {
        const sumA = data.reduce((s, d) => s + (d.byCategory[a] ?? 0), 0);
        const sumB = data.reduce((s, d) => s + (d.byCategory[b] ?? 0), 0);
        return sumB - sumA;
      })
      .slice(0, MAX_CATEGORY_LINES);
  }, [selectedCategories, categories, data]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(cat)) return prev.filter(c => c !== cat);
      if (prev.length >= MAX_CATEGORY_LINES) return prev;
      return [...prev, cat];
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-bg-secondary border border-border-color rounded-xl p-3 text-xs shadow-xl shadow-black/40">
        <p className="font-semibold text-text-primary mb-2 capitalize">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color ?? p.fill }} />
            <span className="text-text-secondary">{p.name}:</span>
            <span className="font-semibold tabular-nums" style={{ color: p.color ?? p.fill }}>
              {fmt(p.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const BalanceTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const val = payload[0]?.value ?? 0;
    return (
      <div className="bg-bg-secondary border border-border-color rounded-xl p-3 text-xs shadow-xl shadow-black/40">
        <p className="font-semibold text-text-primary mb-1 capitalize">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-text-secondary">Balance:</span>
          <span className={`font-bold tabular-nums ${val >= 0 ? 'text-accent-green' : 'text-red-400'}`}>
            {val >= 0 ? '+' : ''}{fmt(val)}
          </span>
        </div>
      </div>
    );
  };

  const tickFormatter = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
    return String(v);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-secondary text-sm">Cargando datos históricos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in">

      {/* Range selector */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary">
          Mostrando los últimos <span className="text-text-primary font-semibold">{months} meses</span>
        </p>
        <div className="flex gap-1 bg-bg-card border border-border-color rounded-lg p-0.5">
          {([6, 12] as const).map(n => (
            <button
              key={n}
              onClick={() => setMonths(n)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                months === n
                  ? 'bg-bg-secondary border border-border-color text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {n} meses
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <ChartCard>
          <EmptyState />
        </ChartCard>
      ) : (
        <>
          {/* 1. Ingresos vs Gastos */}
          <ChartCard>
            <SectionTitle>Ingresos vs Gastos</SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} barSize={18} barGap={3}>
                <defs>
                  <linearGradient id="trendBarGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="trendBarRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="monthLabel" tick={axisStyle} />
                <YAxis tick={axisStyle} tickFormatter={tickFormatter} width={42} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '6px' }} />
                <Bar dataKey="income" name="Ingresos" fill="url(#trendBarGreen)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="expenses" name="Gastos" fill="url(#trendBarRed)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 2. Balance mensual */}
          <ChartCard>
            <SectionTitle>Balance mensual</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="balancePos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="balanceNeg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.25} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="monthLabel" tick={axisStyle} />
                <YAxis tick={axisStyle} tickFormatter={tickFormatter} width={42} />
                <ReferenceLine y={0} stroke="#4b5563" strokeDasharray="4 4" />
                <Tooltip content={<BalanceTooltip />} cursor={{ stroke: '#6b7280', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  name="Balance"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#balancePos)"
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    const color = payload.balance >= 0 ? '#22c55e' : '#ef4444';
                    return <circle key={`dot-${payload.monthKey}`} cx={cx} cy={cy} r={3} fill={color} strokeWidth={0} />;
                  }}
                  activeDot={{ r: 5, stroke: '#1e2130', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 3. Gastos por grupo presupuestario */}
          <ChartCard>
            <SectionTitle>Gastos por grupo presupuestario</SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} barSize={22}>
                <CartesianGrid {...gridStyle} />
                <XAxis dataKey="monthLabel" tick={axisStyle} />
                <YAxis tick={axisStyle} tickFormatter={tickFormatter} width={42} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '6px' }} />
                {(Object.keys(GROUP_COLORS) as Rule502030Group[]).map(group => (
                  <Bar
                    key={group}
                    dataKey={`byGroup.${group}`}
                    name={group}
                    stackId="groups"
                    fill={GROUP_COLORS[group]}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 4. Evolución de categorías */}
          <ChartCard>
            <SectionTitle>Evolución por categoría</SectionTitle>

            {/* Category selector */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {categories.map(cat => {
                  const isSelected = visibleCategories.includes(cat);
                  const color = getCategoryColor(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                        isSelected
                          ? 'border-transparent text-white'
                          : 'border-border-color text-text-secondary hover:text-text-primary hover:border-border-color/80'
                      }`}
                      style={isSelected ? { backgroundColor: color } : {}}
                    >
                      {!isSelected && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      )}
                      {cat}
                    </button>
                  );
                })}
                {selectedCategories.length > 0 && (
                  <button
                    onClick={() => setSelectedCategories([])}
                    className="px-2.5 py-1 rounded-full text-xs text-text-secondary border border-border-color hover:text-text-primary transition-colors"
                  >
                    Resetear
                  </button>
                )}
              </div>
            )}

            {visibleCategories.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="monthLabel" tick={axisStyle} />
                  <YAxis tick={axisStyle} tickFormatter={tickFormatter} width={42} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6b7280', strokeWidth: 1, strokeDasharray: '4 4' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '6px' }} />
                  {visibleCategories.map(cat => (
                    <Line
                      key={cat}
                      type="monotone"
                      dataKey={`byCategory.${cat}`}
                      name={cat}
                      stroke={getCategoryColor(cat)}
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 0, fill: getCategoryColor(cat) }}
                      activeDot={{ r: 5, stroke: '#1e2130', strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
};
