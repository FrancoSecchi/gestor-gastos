import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { InvestmentAsset, InvestmentMovement, NewInvestmentMovement, MovementType, Position } from '../../types/investments';
import { StockPrices } from '../../hooks/useStockPrices';

interface InvestmentFormProps {
  assets: InvestmentAsset[];
  prices: StockPrices;
  positions: Position[];
  initialData?: InvestmentMovement;
  onSave: (m: NewInvestmentMovement) => Promise<void>;
  onClose: () => void;
}

const inputClass = `
  w-full bg-bg-secondary border border-border-color rounded-xl px-3 py-2.5 text-sm text-text-primary
  focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20
  placeholder-text-secondary transition-all duration-150
`;

export const InvestmentForm: React.FC<InvestmentFormProps> = ({ assets, prices, positions, initialData, onSave, onClose }) => {
  const isEdit = initialData != null;
  const [ticker, setTicker] = useState(initialData?.ticker ?? assets[0]?.ticker ?? '');
  const [type, setType] = useState<MovementType>(initialData?.type ?? 'buy');
  const [quantity, setQuantity] = useState(initialData ? String(initialData.quantity) : '');
  const [priceUsd, setPriceUsd] = useState(initialData ? String(initialData.price_usd) : '');
  const [date, setDate] = useState(initialData?.date ?? format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill price when ticker or prices change (only in create mode)
  useEffect(() => {
    if (isEdit) return;
    const p = prices[ticker];
    if (p != null) setPriceUsd(p.toFixed(2));
  }, [ticker, prices, isEdit]);

  const currentPosition = positions.find(p => p.ticker === ticker);
  // When editing a sell, add back the original quantity to the available position
  const originalQty = isEdit && initialData?.type === 'sell' && initialData?.ticker === ticker ? initialData.quantity : 0;
  const currentQty = (currentPosition?.qty ?? 0) + (type === 'sell' ? originalQty : 0);

  function fmtUSD(n: number) {
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qty = parseFloat(quantity);
    const price = parseFloat(priceUsd);

    if (!ticker) return setError('Seleccioná un activo.');
    if (!qty || qty <= 0) return setError('La cantidad debe ser mayor a 0.');
    if (!price || price <= 0) return setError('El precio debe ser mayor a 0.');
    if (!date) return setError('La fecha es requerida.');

    if (type === 'sell' && qty > currentQty) {
      return setError(`No podés vender más de ${currentQty.toFixed(4)} ${ticker} (tu posición actual).`);
    }

    setSaving(true);
    try {
      await onSave({ ticker, type, quantity: qty, price_usd: price, date, notes: notes.trim() || null });
      onClose();
    } catch {
      setError('Error al guardar. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const totalUsd = (parseFloat(quantity) || 0) * (parseFloat(priceUsd) || 0);
  const currentPrice = prices[ticker];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-bg-card border border-border-color rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-color">
          <h2 className="text-sm font-semibold text-text-primary">{isEdit ? 'Editar operación' : 'Registrar operación'}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Type toggle */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-text-secondary mb-2">
              Tipo de operación
            </label>
            <div className="flex rounded-xl border border-border-color overflow-hidden">
              {(['buy', 'sell'] as MovementType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                    type === t
                      ? t === 'buy'
                        ? 'bg-accent-green/15 text-accent-green border-r border-border-color'
                        : 'bg-accent-red/15 text-accent-red'
                      : 'bg-bg-secondary text-text-secondary hover:text-text-primary border-r border-border-color last:border-r-0'
                  }`}
                >
                  {t === 'buy' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {t === 'buy' ? 'Compra' : 'Venta'}
                </button>
              ))}
            </div>
          </div>

          {/* Asset selector */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-text-secondary mb-2">
              Activo
            </label>
            <select
              value={ticker}
              onChange={e => setTicker(e.target.value)}
              className={inputClass}
            >
              {assets.map(a => (
                <option key={a.ticker} value={a.ticker}>
                  {a.ticker} — {a.name}
                </option>
              ))}
            </select>
            {currentPrice != null && (
              <p className="text-[11px] text-text-secondary mt-1.5">
                Precio actual: <span className="text-text-primary font-medium">{fmtUSD(currentPrice)}</span>
                {type === 'sell' && currentQty > 0 && (
                  <span className="ml-2">· Posición: <span className="text-text-primary font-medium">{currentQty.toFixed(4)} {ticker}</span></span>
                )}
              </p>
            )}
            {type === 'sell' && currentQty === 0 && (
              <p className="text-[11px] text-accent-red mt-1.5">No tenés posición en {ticker}.</p>
            )}
          </div>

          {/* Quantity + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-text-secondary mb-2">
                Cantidad
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-text-secondary mb-2">
                Precio USD
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={priceUsd}
                onChange={e => setPriceUsd(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          </div>

          {/* Total preview */}
          {totalUsd > 0 && (
            <div className={`px-3 py-2 rounded-xl text-xs font-medium border ${
              type === 'buy'
                ? 'bg-accent-green/5 border-accent-green/20 text-accent-green'
                : 'bg-accent-red/5 border-accent-red/20 text-accent-red'
            }`}>
              Total: {fmtUSD(totalUsd)}
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-text-secondary mb-2">
              Fecha
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-text-secondary mb-2">
              Notas <span className="normal-case font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: compra programada, DCA..."
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-xs text-accent-red bg-accent-red/5 border border-accent-red/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border-color text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                type === 'buy'
                  ? 'bg-accent-green/15 text-accent-green hover:bg-accent-green/25'
                  : 'bg-accent-red/15 text-accent-red hover:bg-accent-red/25'
              }`}
            >
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : type === 'buy' ? 'Registrar compra' : 'Registrar venta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
