import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Transaction, Rule502030Data } from '../../types';
import { formatARS } from '../../lib/export';
import { calculateRule502030 } from '../../lib/rule502030';
import { Rule502030Mapping } from '../../lib/rule502030Mapping';
import { differenceInDays, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { InfoTooltip } from '../ui/InfoTooltip';

interface Rule502030Props {
  transactions: Transaction[];
  totalIncome: number;
  mapping: Rule502030Mapping;
  startDate?: string;
  endDate?: string;
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

export const Rule502030: React.FC<Rule502030Props> = ({ transactions, totalIncome, mapping, startDate, endDate }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const data = calculateRule502030(transactions, totalIncome, mapping);

  // Calcular ratio de progreso del período
  const progressRatio = (() => {
    if (!startDate || !endDate) return 1;
    const today = startOfDay(new Date());
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    if (isBefore(today, start)) return 0;
    if (isAfter(today, end)) return 1;
    const elapsed = differenceInDays(today, start) + 1;
    const total = differenceInDays(end, start) + 1;
    return elapsed / total;
  })();

  const showProjection = progressRatio > 0 && progressRatio < 1;

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
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-text-primary">Regla 50/30/20</h3>
          <InfoTooltip
            title="Regla 50/30/20"
            content={
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-text-primary mb-1">Cómo funciona</p>
                  <p>Divide tus ingresos en tres grupos con límites recomendados:</p>
                  <ul className="mt-1.5 space-y-0.5 pl-2">
                    <li><span className="text-text-primary font-medium">50% Necesidades</span> — gastos fijos e indispensables (vivienda, comida, transporte, salud).</li>
                    <li><span className="text-text-primary font-medium">30% Deseos</span> — gastos opcionales (entretenimiento, ropa, salidas).</li>
                    <li><span className="text-text-primary font-medium">20% Ahorro/Inversión</span> — dinero que no gastás en el período.</li>
                  </ul>
                  <p className="mt-1.5">Podés reasignar cada categoría a un grupo desde la sección de configuración.</p>
                </div>
                <div>
                  <p className="font-semibold text-text-primary mb-1">Barra de progreso</p>
                  <p>Muestra cuánto del presupuesto de cada grupo ya usaste. Se vuelve naranja cuando superás el límite asignado.</p>
                </div>
                <div>
                  <p className="font-semibold text-text-primary mb-1">Marcador de proyeccion</p>
                  <p>La línea vertical sobre la barra estima dónde terminarás el período si mantenés el ritmo actual de gasto.</p>
                  <p className="mt-1">Fórmula: <span className="text-text-primary">gasto actual ÷ días transcurridos × días totales del período.</span></p>
                  <p className="mt-1">Naranja significa que vas a exceder el presupuesto; gris indica que cerrarás dentro del límite.</p>
                </div>
                <div>
                  <p className="font-semibold text-text-primary mb-1">Salud financiera</p>
                  <p>Puntaje de 0 a 100 que resume cuánto te alejás de los límites. Comienza en 100 y descuenta proporcionalmente por cada grupo excedido.</p>
                  <p className="mt-1">80–100: Excelente · 50–79: Regular · 0–49: Mejorable.</p>
                </div>
              </div>
            }
          />
        </div>
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

          const projectedSpent = showProjection && progressRatio > 0 ? item.spent / progressRatio : null;
          const projectedPct = projectedSpent !== null && item.budget > 0
            ? Math.min((projectedSpent / item.budget) * 100, 100)
            : null;
          const projectionIsOver = projectedSpent !== null && projectedSpent > item.budget;

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

              {/* Gradient progress bar + projection marker */}
              <div className="relative">
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
                {showProjection && projectedPct !== null && mounted && (
                  <div
                    className="absolute top-0 h-2 flex flex-col items-center"
                    style={{ left: `${projectedPct}%`, transform: 'translateX(-50%)' }}
                  >
                    {/* Pip above bar */}
                    <div
                      className="w-0 h-0 -mt-1.5"
                      style={{
                        borderLeft: '3px solid transparent',
                        borderRight: '3px solid transparent',
                        borderTop: `4px solid ${projectionIsOver ? '#f97316' : '#94a3b8'}`,
                      }}
                    />
                    {/* Vertical line */}
                    <div
                      className="w-0.5 h-2 rounded-full"
                      style={{ background: projectionIsOver ? '#f97316' : '#94a3b8' }}
                    />
                  </div>
                )}
              </div>

              {/* Status + projection */}
              <div className="flex items-center justify-between mt-1">
                <p className={`text-xs ${isOver ? 'text-accent-orange' : 'text-text-secondary'}`}>
                  {isOver ? `Excedido por $${formatARS(diff)}` : `Disponible $${formatARS(diff)}`}
                </p>
                <div className="flex items-center gap-2">
                  {showProjection && projectedSpent !== null && (
                    <span className={`text-xs tabular-nums ${projectionIsOver ? 'text-accent-orange' : 'text-text-secondary/60'}`}>
                      → ${formatARS(projectedSpent)}
                    </span>
                  )}
                  <span className={`text-xs font-medium tabular-nums ${isOver ? 'text-accent-orange' : 'text-text-secondary'}`}>
                    {pctUsed.toFixed(0)}%
                  </span>
                </div>
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

      {showProjection && (() => {
        const totalProjected = data.reduce((sum, item) => sum + (progressRatio > 0 ? item.spent / progressRatio : item.spent), 0);
        const remainder = totalIncome - totalProjected;
        const isNegative = remainder < 0;
        return (
          <div className={`mt-3 pt-3 border-t border-border-color flex items-center gap-1.5 text-xs`}>
            <span className="text-text-secondary">A este ritmo cerrarás el mes con</span>
            <span className={`font-semibold tabular-nums ${isNegative ? 'text-accent-orange' : 'text-accent-green'}`}>
              {isNegative ? '-' : '+'}${formatARS(Math.abs(remainder))}
            </span>
            <span className="text-text-secondary">{isNegative ? 'en rojo' : 'disponibles'}</span>
          </div>
        );
      })()}

      <HealthScore data={data} />
    </div>
  );
};
