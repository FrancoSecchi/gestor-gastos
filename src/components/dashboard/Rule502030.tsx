import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Transaction, Rule502030Data } from '../../types';
import { formatARS } from '../../lib/export';
import { calculateRule502030 } from '../../lib/rule502030';
import { Rule502030Mapping } from '../../lib/rule502030Mapping';

interface Rule502030Props {
  transactions: Transaction[];
  totalIncome: number;
  mapping: Rule502030Mapping;
}

const GROUP_META: Record<string, { icon: string; gradient: string; gradientOver: string }> = {
  'Necesidades': {
    icon: '🏠',
    gradient: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
    gradientOver: 'linear-gradient(90deg, #f97316, #ef4444)',
  },
  'Deseos': {
    icon: '🎮',
    gradient: 'linear-gradient(90deg, #a855f7, #ec4899)',
    gradientOver: 'linear-gradient(90deg, #f97316, #ef4444)',
  },
  'Ahorro/Inversión': {
    icon: '💰',
    gradient: 'linear-gradient(90deg, #22c55e, #10b981)',
    gradientOver: 'linear-gradient(90deg, #f97316, #ef4444)',
  },
};

function HealthScore({ data }: { data: Rule502030Data[] }) {
  // Score 0–100: starts at 100, deducts for overages
  let score = 100;
  data.forEach(item => {
    if (item.budget > 0 && item.spent > item.budget) {
      const excess = ((item.spent - item.budget) / item.budget) * 100;
      score -= Math.min(excess * 0.8, 33);
    }
  });
  score = Math.max(0, Math.round(score));

  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
  const label = score >= 80 ? 'Excelente' : score >= 50 ? 'Regular' : 'Mejorable';

  return (
    <div className="mt-3 pt-3 border-t border-border-color">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-text-secondary">Salud financiera</span>
        <span className="text-xs font-bold" style={{ color }}>
          {label} · {score}/100
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-bg-secondary">
        <div
          className="h-full rounded-full transition-all duration-700 health-gradient"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export const Rule502030: React.FC<Rule502030Props> = ({ transactions, totalIncome, mapping }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const data = calculateRule502030(transactions, totalIncome, mapping);

  if (totalIncome === 0) {
    return (
      <div className="bg-bg-card border border-border-color rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info size={15} className="text-accent-blue" />
          <h3 className="text-sm font-semibold text-text-primary">Regla 50/30/20</h3>
        </div>
        <div className="flex flex-col items-center py-4 gap-2">
          <span className="text-3xl">💡</span>
          <p className="text-sm text-text-secondary text-center">
            Registrá ingresos para ver el análisis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-border-color rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Regla 50/30/20</h3>
        <span className="text-xs text-text-secondary tabular-nums">
          ${formatARS(totalIncome)} ingreso
        </span>
      </div>

      <div className="space-y-4">
        {data.map((item, idx) => {
          const pctUsed = item.budget > 0 ? (item.spent / item.budget) * 100 : 0;
          const isOver = item.spent > item.budget;
          const diff = Math.abs(item.budget - item.spent);
          const barWidth = Math.min(pctUsed, 100);
          const meta = GROUP_META[item.group];

          return (
            <div key={item.group} style={{ animationDelay: `${idx * 80}ms` }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{meta.icon}</span>
                  <div>
                    <div className="flex items-center gap-1">
                      {isOver ? (
                        <AlertTriangle size={11} className="text-accent-orange" />
                      ) : (
                        <CheckCircle size={11} className="text-accent-green" />
                      )}
                      <span className="text-xs font-semibold text-text-primary">{item.group}</span>
                      <span className="text-xs text-text-secondary">({item.percentage}%)</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold tabular-nums ${isOver ? 'text-accent-orange' : 'text-text-primary'}`}>
                    ${formatARS(item.spent)}
                  </span>
                  <span className="text-xs text-text-secondary"> / ${formatARS(item.budget)}</span>
                </div>
              </div>

              {/* Gradient progress bar */}
              <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: mounted ? `${barWidth}%` : '0%',
                    background: isOver ? meta.gradientOver : meta.gradient,
                    transition: `width 0.8s cubic-bezier(0.16,1,0.3,1) ${idx * 100}ms`,
                  }}
                />
              </div>

              {/* Status + percentage */}
              <div className="flex items-center justify-between mt-1">
                <p className={`text-xs ${isOver ? 'text-accent-orange' : 'text-text-secondary'}`}>
                  {isOver
                    ? `Excedido por $${formatARS(diff)}`
                    : `Disponible $${formatARS(diff)}`
                  }
                </p>
                <span className={`text-xs font-medium tabular-nums ${isOver ? 'text-accent-orange' : 'text-text-secondary'}`}>
                  {pctUsed.toFixed(0)}%
                </span>
              </div>

              {/* Category tags */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {item.categories.map(cat => (
                  <span
                    key={cat}
                    className="text-xs px-1.5 py-0.5 rounded-md bg-bg-secondary text-text-secondary border border-border-color/50"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <HealthScore data={data} />
    </div>
  );
};
