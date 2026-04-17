import React from 'react';
import { RefreshCw, AlertCircle, ArrowLeftRight } from 'lucide-react';
import { CurrencyInfo, ExchangeRates, SUPPORTED_CURRENCIES } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExchangeRateCardProps {
  currency: CurrencyInfo;
  rates: ExchangeRates | null;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  onRefresh: () => void;
}

const CURRENCY_GRADIENTS: Record<string, { gradient: string; shadow: string }> = {
  USD: { gradient: 'linear-gradient(135deg, #22c55e, #10b981)', shadow: 'rgba(34,197,94,0.2)' },
  EUR: { gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)', shadow: 'rgba(59,130,246,0.2)' },
  MAD: { gradient: 'linear-gradient(135deg, #f97316, #eab308)', shadow: 'rgba(249,115,22,0.2)' },
  ARS: { gradient: 'linear-gradient(135deg, #a855f7, #ec4899)', shadow: 'rgba(168,85,247,0.2)' },
};

function formatRate(value: number, decimals = 4): string {
  if (value >= 100) return value.toLocaleString('es-AR', { maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString('es-AR', { maximumFractionDigits: 4 });
  return value.toLocaleString('es-AR', { maximumFractionDigits: 6 });
}

export const ExchangeRateCard: React.FC<ExchangeRateCardProps> = ({
  currency,
  rates,
  loading,
  error,
  lastUpdate,
  onRefresh,
}) => {
  const timeAgoStr = lastUpdate
    ? formatDistanceToNow(lastUpdate, { addSuffix: true, locale: es })
    : null;

  const targetCurrencies = SUPPORTED_CURRENCIES.filter(c => c.code !== currency.code);
  const hasRates = rates && Object.keys(rates.rates).length > 0;

  return (
    <div className="bg-bg-card border border-border-color rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-accent-blue/15 flex items-center justify-center">
            <ArrowLeftRight size={12} className="text-accent-blue" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">
            Conversiones desde {currency.symbol} {currency.code}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {timeAgoStr && (
            <span className="text-xs text-text-secondary">{timeAgoStr}</span>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all duration-200 disabled:opacity-50"
            title="Actualizar tipos de cambio"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && !hasRates && (
        <div className="flex items-center gap-2 text-xs text-accent-orange bg-accent-orange/10 rounded-lg px-3 py-2 border border-accent-orange/20">
          <AlertCircle size={12} />
          <span>Sin datos de conversión disponibles</span>
        </div>
      )}

      {loading && !hasRates ? (
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="skeleton rounded-xl h-14" />
          ))}
        </div>
      ) : hasRates ? (
        <div className="grid grid-cols-3 gap-2">
          {targetCurrencies.map(target => {
            const rate = rates!.rates[target.code];
            const style = CURRENCY_GRADIENTS[target.code] ?? CURRENCY_GRADIENTS['USD'];
            if (rate === undefined) return null;
            return (
              <div
                key={target.code}
                className="relative overflow-hidden bg-bg-secondary rounded-xl p-2.5 border border-border-color/50 hover:border-border-color transition-all duration-200"
                title={`1 ${currency.code} = ${formatRate(rate)} ${target.code}`}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
                  style={{ background: style.gradient }}
                />
                <p className="text-xs text-text-secondary mb-1 mt-0.5">{target.code}</p>
                <p
                  className="text-sm font-bold tabular-nums truncate"
                  style={{
                    background: style.gradient,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {target.symbol} {formatRate(rate)}
                </p>
                <p className="text-xs text-text-secondary mt-0.5 truncate">{target.name.split(' ')[0]}</p>
              </div>
            );
          })}
        </div>
      ) : null}

      {hasRates && (
        <p className="text-xs text-text-secondary mt-2 opacity-60">
          Tasas de mercado · Fuente: frankfurter.app
        </p>
      )}
    </div>
  );
};
