import React from 'react';
import { RefreshCw, AlertCircle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { DollarRate, Summary, CurrencyInfo } from '../../types';
import { formatARS } from '../../lib/export';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { InfoTooltip } from '../ui/InfoTooltip';

interface HeaderProps {
  title: string;
  tooltipContent?: React.ReactNode;
  dollarRates: DollarRate[];
  dollarLoading: boolean;
  dollarError: string | null;
  lastUpdate: Date | null;
  onRefreshDollar: () => void;
  summary?: Summary | null;
  selectedCurrency: CurrencyInfo;
}

const DOLLAR_NAMES: Record<string, string> = {
  'blue': 'Blue',
  'oficial': 'Oficial',
  'bolsa': 'MEP',
  'contadoconliqui': 'CCL',
  'tarjeta': 'Tarjeta',
  'mayorista': 'Mayorista',
};

function timeAgo(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
}

export const Header: React.FC<HeaderProps> = ({
  title,
  tooltipContent,
  dollarRates,
  dollarLoading,
  dollarError,
  lastUpdate,
  onRefreshDollar,
  summary,
  selectedCurrency,
}) => {
  const { fmt } = useCurrencyFormat();
  const showDollarRates = selectedCurrency.code === 'ARS';
  const keyRates = showDollarRates
    ? dollarRates.filter(r => ['blue', 'oficial', 'bolsa'].includes(r.nombre.toLowerCase()))
    : [];

  // Simulated trend: if rate venta > compra by more than 3% consider "up"
  const getRateTrend = (rate: DollarRate) => {
    const spread = ((rate.venta - rate.compra) / rate.compra) * 100;
    return spread > 2 ? 'up' : 'neutral';
  };

  const balancePositive = (summary?.balance ?? 0) >= 0;

  const [timeAgoStr, setTimeAgoStr] = React.useState(() =>
    lastUpdate ? timeAgo(lastUpdate) : null
  );

  React.useEffect(() => {
    if (!lastUpdate) return;
    setTimeAgoStr(timeAgo(lastUpdate));
    const interval = setInterval(() => setTimeAgoStr(timeAgo(lastUpdate)), 30000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-bg-secondary border-b border-border-color">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-text-primary">{title}</h1>
          {tooltipContent && (
            <InfoTooltip title={title} content={tooltipContent} />
          )}
        </div>

        {/* Balance badge */}
        {summary && (
          <div className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold
            border transition-all duration-300
            ${balancePositive
              ? 'bg-accent-green/10 border-accent-green/25 text-accent-green'
              : 'bg-accent-red/10 border-accent-red/25 text-accent-red'
            }
          `}>
            {balancePositive
              ? <TrendingUp size={11} />
              : <TrendingDown size={11} />
            }
            <span>{balancePositive ? '+' : ''}{fmt(summary.balance)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Dollar rates */}
        {dollarError && !keyRates.length && (
          <div className="flex items-center gap-1.5 text-accent-orange text-xs">
            <AlertCircle size={13} />
            <span>Sin cotización</span>
          </div>
        )}

        {keyRates.length > 0 && (
          <div className="flex items-center gap-3">
            {keyRates.map(rate => {
              const trend = getRateTrend(rate);
              const name = DOLLAR_NAMES[rate.nombre.toLowerCase()] ?? rate.nombre;
              return (
                <div
                  key={rate.nombre}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-card border border-border-color hover:border-accent-green/30 transition-all duration-200 cursor-default"
                  title={`Compra: $${formatARS(rate.compra)} / Venta: $${formatARS(rate.venta)}`}
                >
                  <DollarSign size={10} className="text-text-secondary" />
                  <span className="text-xs text-text-secondary">{name}</span>
                  <span className="text-xs font-bold text-accent-green tabular-nums">
                    ${formatARS(rate.venta)}
                  </span>
                  {trend === 'up' && (
                    <TrendingUp size={9} className="text-accent-green opacity-60" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Separator */}
        {showDollarRates && keyRates.length > 0 && (
          <div className="w-px h-5 bg-border-color" />
        )}

        {/* Last update + refresh — only shown for ARS */}
        {showDollarRates && (
          <div className="flex items-center gap-2">
            {timeAgoStr && (
              <span className="text-xs text-text-secondary" title={lastUpdate?.toLocaleString()}>
                Actualizado {timeAgoStr}
              </span>
            )}
            <button
              onClick={onRefreshDollar}
              disabled={dollarLoading}
              className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-card border border-transparent hover:border-border-color transition-all duration-200 disabled:opacity-50"
              title="Actualizar cotizaciones"
            >
              <RefreshCw size={13} className={dollarLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
