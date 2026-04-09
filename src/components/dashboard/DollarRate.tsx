import React from 'react';
import { DollarSign, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';
import { DollarRate as DollarRateType } from '../../types';
import { formatARS } from '../../lib/export';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface DollarRateProps {
  rates: DollarRateType[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  onRefresh: () => void;
}

const DOLLAR_DISPLAY: Record<string, { label: string; gradient: string; shadow: string }> = {
  'blue': {
    label: 'Blue',
    gradient: 'linear-gradient(135deg, #22c55e, #10b981)',
    shadow: 'rgba(34,197,94,0.2)',
  },
  'oficial': {
    label: 'Oficial',
    gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    shadow: 'rgba(59,130,246,0.2)',
  },
  'bolsa': {
    label: 'MEP',
    gradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
    shadow: 'rgba(168,85,247,0.2)',
  },
  'contadoconliqui': {
    label: 'CCL',
    gradient: 'linear-gradient(135deg, #f97316, #eab308)',
    shadow: 'rgba(249,115,22,0.2)',
  },
  'tarjeta': {
    label: 'Tarjeta',
    gradient: 'linear-gradient(135deg, #eab308, #f97316)',
    shadow: 'rgba(234,179,8,0.2)',
  },
  'mayorista': {
    label: 'Mayorista',
    gradient: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
    shadow: 'rgba(6,182,212,0.2)',
  },
};

export const DollarRate: React.FC<DollarRateProps> = ({
  rates,
  loading,
  error,
  lastUpdate,
  onRefresh,
}) => {
  const displayRates = rates.filter(r =>
    Object.keys(DOLLAR_DISPLAY).includes(r.casa?.toLowerCase())
  );

  const timeAgoStr = lastUpdate
    ? formatDistanceToNow(lastUpdate, { addSuffix: true, locale: es })
    : null;

  return (
    <div className="bg-bg-card border border-border-color rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-accent-green/15 flex items-center justify-center">
            <DollarSign size={12} className="text-accent-green" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">Cotización USD</h3>
        </div>
        <div className="flex items-center gap-2">
          {timeAgoStr && (
            <span className="text-xs text-text-secondary">{timeAgoStr}</span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all duration-200 disabled:opacity-50"
            title="Actualizar cotizaciones"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && !displayRates.length && (
        <div className="flex items-center gap-2 text-xs text-accent-orange bg-accent-orange/10 rounded-lg px-3 py-2 border border-accent-orange/20">
          <AlertCircle size={12} />
          <span>Sin cotización disponible</span>
        </div>
      )}

      {loading && !displayRates.length ? (
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="skeleton rounded-xl h-14" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {displayRates.slice(0, 6).map(rate => {
            const display = DOLLAR_DISPLAY[rate.casa?.toLowerCase()];
            if (!display) return null;
            const spread = (((rate.venta - rate.compra) / rate.compra) * 100).toFixed(1);
            return (
              <div
                key={rate.nombre}
                className="relative overflow-hidden bg-bg-secondary rounded-xl p-2.5 border border-border-color/50 hover:border-border-color transition-all duration-200 group"
                title={`Compra: $${formatARS(rate.compra)} · Spread: ${spread}%`}
              >
                {/* Gradient accent top bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
                  style={{ background: display.gradient }}
                />
                <p className="text-xs text-text-secondary mb-1 mt-0.5">{display.label}</p>
                <div className="flex items-center gap-1">
                  <TrendingUp size={9} className="text-text-secondary opacity-60" />
                  <p
                    className="text-sm font-bold tabular-nums"
                    style={{
                      background: display.gradient,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    ${formatARS(rate.venta)}
                  </p>
                </div>
                <p className="text-xs text-text-secondary mt-0.5 tabular-nums">
                  c: ${formatARS(rate.compra)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
