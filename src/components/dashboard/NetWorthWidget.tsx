import React, { useEffect, useState } from 'react';
import { Wallet, PiggyBank, TrendingUp, CreditCard } from 'lucide-react';
import { DebtWithPayments } from '../../hooks/useDebts';
import { useCurrencyFormat } from '../../contexts/CurrencyContext';
import { getInvestmentMovements, calculatePositions } from '../../lib/investments';
import { logError } from '../../lib/db';

interface NetWorthWidgetProps {
  totalSavings: number;
  debts: DebtWithPayments[];
}

export const NetWorthWidget: React.FC<NetWorthWidgetProps> = ({ totalSavings, debts }) => {
  const { fmt } = useCurrencyFormat();
  const [totalInvestedUsd, setTotalInvestedUsd] = useState(0);
  const [loadingInvestments, setLoadingInvestments] = useState(true);

  useEffect(() => {
    getInvestmentMovements()
      .then(movements => {
        const positions = calculatePositions(movements);
        setTotalInvestedUsd(positions.reduce((sum, p) => sum + p.investedUsd, 0));
      })
      .catch(err => logError('NetWorthWidget', err))
      .finally(() => setLoadingInvestments(false));
  }, []);

  const totalDebtsArs = debts
    .filter(d => d.direction === 'i_owe' && d.currency === 'ARS')
    .reduce((sum, d) => sum + d.remaining_amount, 0);

  const totalDebtsUsd = debts
    .filter(d => d.direction === 'i_owe' && d.currency === 'USD')
    .reduce((sum, d) => sum + d.remaining_amount, 0);

  // USD debts excluded from ARS net worth — no exchange rate available here
  const netWorthArs = totalSavings - totalDebtsArs;
  const isPositive = netWorthArs >= 0;

  function fmtUsd(amount: number): string {
    return `U$S ${amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  return (
    <div className="bg-bg-card border border-border-color rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={15} className="text-text-secondary" />
          <h3 className="text-sm font-semibold text-text-primary">Patrimonio Neto</h3>
        </div>

        {/* Total ARS */}
        {loadingInvestments ? (
          <div className="h-8 mb-4 flex items-center justify-center">
            <div className="h-2 w-24 bg-bg-secondary rounded-full animate-pulse" />
          </div>
        ) : (
          <p className={`text-2xl font-bold text-center mb-4 tabular-nums ${isPositive ? 'text-accent-green' : 'text-accent-red'}`}>
            {fmt(netWorthArs)}
          </p>
        )}

        {/* Desglose */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-text-secondary">
              <PiggyBank size={13} />
              <span>Ahorros</span>
            </div>
            <span className="text-text-primary tabular-nums">{fmt(totalSavings)}</span>
          </div>

          {totalInvestedUsd > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-text-secondary">
                <TrendingUp size={13} />
                <span>Inversiones</span>
              </div>
              <span className="text-text-primary tabular-nums">{fmtUsd(totalInvestedUsd)}</span>
            </div>
          )}

          {(totalDebtsArs > 0 || totalDebtsUsd > 0) && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-text-secondary">
                <CreditCard size={13} />
                <span>Deudas</span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                {totalDebtsArs > 0 && (
                  <span className="text-accent-red tabular-nums">−{fmt(totalDebtsArs)}</span>
                )}
                {totalDebtsUsd > 0 && (
                  <span className="text-accent-red tabular-nums">−{fmtUsd(totalDebtsUsd)}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
