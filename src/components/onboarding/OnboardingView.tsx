import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, BarChart2, Target, PiggyBank, TrendingUp, CreditCard, Home, Check } from 'lucide-react';
import { CurrencyCode, CurrencyInfo, SUPPORTED_CURRENCIES } from '../../types';

interface OnboardingViewProps {
  currency: CurrencyInfo;
  setCurrency: (code: CurrencyCode) => Promise<void>;
  onComplete: (openForm?: boolean) => void;
}

const SECTIONS = [
  { icon: BarChart2, label: 'Movimientos', desc: 'Registrá ingresos y gastos' },
  { icon: Target, label: 'Presupuesto', desc: 'Controlá tus límites' },
  { icon: PiggyBank, label: 'Ahorros', desc: 'Seguí tus metas' },
  { icon: TrendingUp, label: 'Inversiones', desc: 'Gestioná tu cartera' },
  { icon: CreditCard, label: 'Deudas', desc: 'Controlá lo que debés' },
  { icon: Home, label: 'Vivienda', desc: 'Seguí tu alquiler' },
];

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {([1, 2, 3] as const).map((step, i) => (
        <React.Fragment key={step}>
          {i > 0 && (
            <div className={`flex-1 h-px ${step <= current ? 'bg-accent-green' : 'bg-border-color'}`} />
          )}
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            step < current
              ? 'bg-accent-green text-white'
              : step === current
              ? 'bg-accent-primary text-white'
              : 'bg-bg-secondary text-text-secondary border border-border-color'
          }`}>
            {step < current ? <Check size={12} /> : step}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ currency, setCurrency, onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCode, setSelectedCode] = useState<CurrencyCode>(currency.code);

  const handleCurrencySelect = async (code: CurrencyCode) => {
    setSelectedCode(code);
    await setCurrency(code);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-8">
      <div className="w-full max-w-lg">
        <StepIndicator current={step} />

        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">👋 Bienvenido a Gastos Personales</h1>
            <p className="text-text-secondary mb-6">Todo lo que podés hacer con la app:</p>
            <div className="flex flex-col gap-2 mb-8">
              {SECTIONS.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-center gap-3 bg-bg-card border border-border-color rounded-lg px-4 py-3">
                  <Icon size={16} className="text-text-secondary shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-text-primary">{label}</span>
                    <span className="text-sm text-text-secondary"> — {desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">💰 ¿Con qué moneda trabajás?</h1>
            <p className="text-text-secondary mb-6">Podés cambiarlo después desde Ajustes.</p>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {SUPPORTED_CURRENCIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => handleCurrencySelect(c.code)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
                    selectedCode === c.code
                      ? 'border-accent-primary bg-accent-primary/10 text-text-primary'
                      : 'border-border-color bg-bg-card text-text-secondary hover:border-text-secondary'
                  }`}
                >
                  <span className="text-lg font-bold">{c.symbol}</span>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{c.code}</p>
                    <p className="text-xs text-text-secondary">{c.name}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-text-primary transition-colors text-sm"
              >
                <ChevronLeft size={16} /> Atrás
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">¡Todo listo!</h1>
            <p className="text-text-secondary mb-8">Ya podés empezar a usar la app.</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => onComplete(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-accent-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                + Cargar primera transacción
              </button>
              <button
                onClick={() => onComplete(false)}
                className="px-4 py-3 border border-border-color text-text-secondary rounded-lg text-sm hover:text-text-primary hover:border-text-secondary transition-colors"
              >
                Ir al dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
