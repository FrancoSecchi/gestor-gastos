import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { CategoryEditor } from '../settings/CategoryEditor';
import { Transaction, getCategoryColor } from '../../types';
import { formatARS } from '../../lib/export';

interface CategoriesViewProps {
  transactions: Transaction[];
  expenseCategories: string[];
  incomeCategories: string[];
  customExpenseCategories: string[];
  customIncomeCategories: string[];
  categoryIcons: Record<string, string>;
  onSetIcon: (cat: string, icon: string) => Promise<void>;
  onAddExpense: (name: string) => Promise<void>;
  onAddIncome: (name: string) => Promise<void>;
  onRemoveExpense: (name: string) => Promise<void>;
  onRemoveIncome: (name: string) => Promise<void>;
  onRenameExpense: (oldName: string, newName: string) => Promise<void>;
  onRenameIncome: (oldName: string, newName: string) => Promise<void>;
}

const CustomTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: { value: number; payload: { category: string; count: number; fill: string } }[];
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-bg-secondary border border-border-color rounded-xl p-3 text-sm shadow-xl shadow-black/40">
      <p className="font-semibold text-text-primary mb-1">{d.category}</p>
      <p className="text-accent-red font-bold tabular-nums">${formatARS(payload[0].value)}</p>
      <p className="text-text-secondary text-xs mt-0.5">{d.count} transacciones</p>
    </div>
  );
};

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  transactions,
  expenseCategories,
  incomeCategories,
  customExpenseCategories,
  customIncomeCategories,
  categoryIcons,
  onSetIcon,
  onAddExpense,
  onAddIncome,
  onRemoveExpense,
  onRemoveIncome,
  onRenameExpense,
  onRenameIncome,
}) => {
  const chartData = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    for (const tx of transactions) {
      if (tx.type !== 'expense') continue;
      if (!map[tx.category]) map[tx.category] = { total: 0, count: 0 };
      map[tx.category].total += tx.amount;
      map[tx.category].count += 1;
    }
    return Object.entries(map)
      .map(([category, { total, count }]) => ({
        category,
        total,
        count,
        fill: getCategoryColor(category),
        icon: categoryIcons[category] ?? '💳',
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [transactions, categoryIcons]);

  const axisStyle = { fill: '#94a3b8', fontSize: 11 };
  const gridStyle = { stroke: '#2d3148', strokeDasharray: '3 3' };
  const barHeight = 36;
  const chartHeight = Math.max(200, chartData.length * barHeight + 40);

  const CustomYLabel = ({ x, y, value }: { x?: number; y?: number; value?: string }) => {
    const item = chartData.find(d => d.category === value);
    return (
      <text x={(x ?? 0) - 6} y={(y ?? 0) + 1} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="#94a3b8">
        {item?.icon} {value && value.length > 14 ? value.slice(0, 13) + '…' : value}
      </text>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Categorías</h2>
        <p className="text-sm text-text-secondary mt-1">
          Gestioná tus categorías y visualizá en qué gastás más.
        </p>
      </div>

      {/* Horizontal bar chart */}
      <div className="bg-bg-card border border-border-color rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Gastos por categoría</h3>
        {chartData.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center gap-2 text-text-secondary">
            <span className="text-2xl opacity-30">📊</span>
            <p className="text-xs">Sin transacciones de gasto en el período</p>
          </div>
        ) : (
          <div className="flex gap-6">
            <div className="flex-1 min-w-0">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 110, bottom: 0 }}
                  barSize={18}
                >
                  <CartesianGrid horizontal={false} {...gridStyle} />
                  <XAxis
                    type="number"
                    tick={axisStyle}
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={<CustomYLabel />}
                    axisLine={false}
                    tickLine={false}
                    width={110}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend list */}
            <div className="w-52 shrink-0 flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: chartHeight }}>
              {chartData.map(item => {
                const grandTotal = chartData.reduce((s, d) => s + d.total, 0);
                const pct = grandTotal > 0 ? ((item.total / grandTotal) * 100).toFixed(1) : '0';
                return (
                  <div
                    key={item.category}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-secondary/60 transition-colors"
                  >
                    <span className="text-base leading-none shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{item.category}</p>
                      <p className="text-xs text-text-secondary tabular-nums">${formatARS(item.total)}</p>
                    </div>
                    <span
                      className="text-xs font-semibold tabular-nums shrink-0"
                      style={{ color: item.fill }}
                    >
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Category editor */}
      <div className="bg-bg-card border border-border-color rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Administrar categorías</h3>
        <CategoryEditor
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
          customExpenseCategories={customExpenseCategories}
          customIncomeCategories={customIncomeCategories}
          icons={categoryIcons}
          onSetIcon={onSetIcon}
          onAddExpense={onAddExpense}
          onAddIncome={onAddIncome}
          onRemoveExpense={onRemoveExpense}
          onRemoveIncome={onRemoveIncome}
          onRenameExpense={onRenameExpense}
          onRenameIncome={onRenameIncome}
        />
      </div>
    </div>
  );
};
