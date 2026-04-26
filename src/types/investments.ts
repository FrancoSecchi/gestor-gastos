export type MovementType = 'buy' | 'sell';

export interface InvestmentAsset {
  ticker: string;
  name: string;
  created_at: string;
}

export interface InvestmentMovement {
  id: string;
  ticker: string;
  type: MovementType;
  quantity: number;
  price_usd: number;
  date: string;
  notes: string | null;
  created_at: string;
}

export interface NewInvestmentMovement {
  ticker: string;
  type: MovementType;
  quantity: number;
  price_usd: number;
  date: string;
  notes?: string | null;
}

export interface Position {
  ticker: string;
  qty: number;
  avgBuyPrice: number;
  investedUsd: number;
  currentPrice: number | null;
  currentValueUsd: number | null;
  pnlUsd: number | null;
  pnlPct: number | null;
}
