import React, { useState, useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area,
} from 'recharts';
import { Transaction, CategorySummary, getCategoryColor } from '../../types';
import { formatARS } from '../../lib/export';
import { format, parseISO, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExpenseChartProps {
  transactions: Transaction[];
  byCategory: CategorySummary[];
}

// Custom tooltip for Pie
const CustomTooltipPie = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const pct = payload[0].payload.percent
      ? (payload[0].payload.percent * 100).toFixed(1)
      : null;
    return (
      <div className="bg-bg-secondary border border-border-color rounded-xl p-3 text-sm shadow-xl shadow-black/40">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
          <p className="font-semibold text-text-primary">{payload[0].name}</p>
        </div>
        <p className="text-accent-green font-bold tabular-nums">${formatARS(payload[0].value)}</p>
        {pct && <p className="text-text-secondary text-xs mt-0.5">{pct}% del total</p>}
      </div>
    );
  }
  return null;
};

// Custom tooltip for Bar
const CustomTooltipBar = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-secondary border border-border-color rounded-xl p-3 text-sm shadow-xl shadow-black/40">
        <p className="font-semibold text-text-primary mb-2 capitalize">{label}</p>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-text-secondary">{p.name}:</span>
            <span className="font-semibold tabular-nums" style={{ color: p.color }}>
              ${formatARS(p.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Custom tooltip for Area
const CustomTooltipArea = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0]?.value ?? 0;
    return (
      <div className="bg-bg-secondary border border-border-color rounded-xl p-3 text-sm shadow-xl shadow-black/40">
        <p className="font-semibold text-text-primary mb-1 capitalize">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-blue" />
          <span className="text-text-secondary">Balance:</span>
          <span className={`font-bold tabular-nums ${value >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {value >= 0 ? '+' : ''}${formatARS(value)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// Custom label for Pie
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: {
  cx: number; cy: number; midAngle: number;
  innerRadius: number; outerRadius: number;
  percent: number; name: string;
}) => {
  if (percent < 0.06) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const ExpenseChart = React.memo((props: ExpenseChartProps) => {
  const { transactions, byCategory } = props;
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Pie chart data
  const pieData = byCategory.slice(0, 8).map(cat => ({
    name: cat.category,
    value: cat.total,
    fill: getCategoryColor(cat.category),
  }));

  const total = pieData.reduce((s, d) => s + d.value, 0);

  // Bar chart: income vs expenses by month
  const monthlyData = React.useMemo(() => {
    const monthMap: Record<string, { month: string; Ingresos: number; Gastos: number }> = {};
    transactions.forEach(tx => {
      const monthKey = format(startOfMonth(parseISO(tx.date)), 'yyyy-MM');
      const label = format(parseISO(tx.date), 'MMM yy', { locale: es });
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { month: label, Ingresos: 0, Gastos: 0 };
      }
      if (tx.type === 'income') {
        monthMap[monthKey].Ingresos += tx.amount;
      } else {
        monthMap[monthKey].Gastos += tx.amount;
      }
    });
    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  // Area chart: savings evolution
  const savingsData = useMemo(
    () => monthlyData.map(m => ({ month: m.month, ahorro: m.Ingresos - m.Gastos })),
    [monthlyData]
  );

  const axisStyle = { fill: '#94a3b8', fontSize: 10 };
  const gridStyle = { stroke: '#2d3148', strokeDasharray: '3 3' };

  const emptyState = (h: number) => (
    <div className={`h-${h} flex flex-col items-center justify-center gap-2 text-text-secondary`}>
      <span className="text-2xl opacity-40">📊</span>
      <p className="text-xs">Sin datos para mostrar</p>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Pie Chart */}
      <div className="bg-bg-card border border-border-color rounded-xl p-4 col-span-2 card-hover">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Gastos por Categoría</h3>
        {pieData.length > 0 ? (
          <div className="flex gap-6 items-center">
            <ResponsiveContainer width="35%" height={210}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomLabel}
                  isAnimationActive={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fill}
                      opacity={hoveredCategory === null || hoveredCategory === entry.name ? 1 : 0.35}
                      style={{ transition: 'opacity 0.2s', cursor: 'pointer' }}
                      onMouseEnter={() => setHoveredCategory(entry.name)}
                      onMouseLeave={() => setHoveredCategory(null)}
                    />
                  ))}
                </Pie>
                <Tooltip content={CustomTooltipPie} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1.5">
              {pieData.map(item => {
                const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                const isHovered = hoveredCategory === item.name;
                return (
                  <div
                    key={item.name}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-150 ${
                      isHovered ? 'bg-bg-secondary' : 'hover:bg-bg-secondary/50'
                    }`}
                    onMouseEnter={() => setHoveredCategory(item.name)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.fill }} />
                    <span className="text-xs text-text-secondary truncate flex-1">{item.name}</span>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs text-text-primary font-semibold tabular-nums block">
                        ${formatARS(item.value)}
                      </span>
                      <span className="text-xs text-text-secondary tabular-nums">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : emptyState(48)}
      </div>

      {/* Bar Chart */}
      <div className="bg-bg-card border border-border-color rounded-xl p-4 col-span-2 card-hover">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Ingresos vs Gastos</h3>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={monthlyData} barSize={22} barGap={4}>
              <defs>
                <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="barRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="month" tick={axisStyle} />
              <YAxis tick={axisStyle} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={40} />
              <Tooltip content={CustomTooltipBar} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
              <Legend
                wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '4px' }}
              />
              <Bar dataKey="Ingresos" fill="url(#barGreen)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="Gastos" fill="url(#barRed)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        ) : emptyState(48)}
      </div>

      {/* Area Chart - balance evolution */}
      <div className="bg-bg-card border border-border-color rounded-xl p-4 col-span-2 card-hover">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Evolución del Balance</h3>
        {savingsData.length > 0 ? (
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={savingsData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="areaBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.20} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="month" tick={axisStyle} />
              <YAxis tick={axisStyle} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={40} />
              <Tooltip content={CustomTooltipArea} cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey="ahorro"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#areaBlue)"
                dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#3b82f6', stroke: '#1e2130', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : emptyState(32)}
      </div>
    </div>
  );
});
