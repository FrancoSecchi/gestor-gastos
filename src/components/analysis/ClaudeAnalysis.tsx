import React, { useState, useEffect } from 'react';
import { Brain, AlertCircle, Key, Copy, Check, Sparkles, TrendingUp, PiggyBank, BarChart2, Zap } from 'lucide-react';
import { Transaction, Summary } from '../../types';
import { analyzeWithClaude } from '../../lib/claude';
import { exportForClaude } from '../../lib/export';
import { getSetting } from '../../lib/db';
import { formatARS } from '../../lib/export';
import { calculateRule502030 } from '../../lib/budgetRule';
import { Rule502030Mapping } from '../../lib/budgetRuleMapping';

interface ClaudeAnalysisProps {
  transactions: Transaction[];
  summary: Summary | null;
  startDate: string;
  endDate: string;
  rule502030Mapping: Rule502030Mapping;
  onNavigateSettings: () => void;
}

// Simple markdown renderer
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('# ')) {
      elements.push(<h1 key={i}>{line.slice(2)}</h1>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i}>{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i}>{line.slice(4)}</h3>);
    } else if (line.startsWith('---')) {
      elements.push(<hr key={i} />);
    } else if (line.startsWith('> ')) {
      elements.push(<blockquote key={i}>{line.slice(2)}</blockquote>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        listItems.push(<li key={i}>{renderInline(lines[i].slice(2))}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`}>{listItems}</ul>);
      continue;
    } else if (/^\d+\. /.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        listItems.push(<li key={i}>{renderInline(lines[i].replace(/^\d+\. /, ''))}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`}>{listItems}</ol>);
      continue;
    } else if (line.trim() === '') {
      // skip empty lines
    } else {
      elements.push(<p key={i}>{renderInline(line)}</p>);
    }
    i++;
  }
  return elements;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

// Rotating loading messages
const LOADING_MESSAGES = [
  'Analizando tus transacciones...',
  'Procesando patrones de gasto...',
  'Calculando la regla 50/30/20...',
  'Identificando oportunidades de ahorro...',
  'Generando insights personalizados...',
  'Preparando recomendaciones...',
];

function RotatingLoader() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(p => (p + 1) % LOADING_MESSAGES.length), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-bg-card border border-border-color rounded-xl p-10 flex flex-col items-center gap-5">
      {/* Animated brain icon */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center">
          <Brain size={28} className="text-accent-blue" />
        </div>
        {/* Orbiting dots */}
        <div className="absolute inset-0 animate-spin-slow">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-1.5 h-1.5 rounded-full bg-accent-blue" />
        </div>
        <div className="absolute inset-0 animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '3s' }}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-1.5 h-1.5 rounded-full bg-accent-green" />
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-text-primary mb-1">Claude está trabajando</p>
        <p
          key={idx}
          className="text-xs text-text-secondary animate-fade-in"
        >
          {LOADING_MESSAGES[idx]}
        </p>
      </div>

      {/* Animated progress bar */}
      <div className="w-48 h-1 bg-bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #3b82f6, #22c55e)',
            animation: 'shimmer 1.5s ease-in-out infinite',
            backgroundSize: '200% 100%',
          }}
        />
      </div>
    </div>
  );
}

// Preview of insights when no analysis has been run
function InsightsPreview() {
  const features = [
    { icon: TrendingUp, label: 'Análisis de patrones', desc: 'Identifica tus mayores gastos y tendencias mes a mes', color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
    { icon: PiggyBank, label: 'Consejos de ahorro', desc: 'Recomendaciones personalizadas para mejorar tu tasa de ahorro', color: 'text-accent-green', bg: 'bg-accent-green/10' },
    { icon: BarChart2, label: 'Regla 50/30/20', desc: 'Evaluación detallada de cómo distribuís tu dinero', color: 'text-accent-purple', bg: 'bg-accent-purple/10' },
    { icon: Zap, label: 'Contexto argentino', desc: 'Consejos adaptados a la inflación y economía local', color: 'text-accent-yellow', bg: 'bg-accent-yellow/10' },
  ];

  return (
    <div className="bg-bg-card border border-border-color rounded-xl p-6">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-blue/20 to-accent-green/20 border border-accent-blue/20 flex items-center justify-center mx-auto mb-3 animate-float">
          <Sparkles size={24} className="text-accent-blue" />
        </div>
        <h3 className="text-sm font-semibold text-text-primary mb-1">
          Análisis con Inteligencia Artificial
        </h3>
        <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
          Claude analizará todas tus transacciones y te dará insights únicos. Esto es lo que vas a obtener:
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={f.label}
              className="flex gap-3 p-3 rounded-xl bg-bg-secondary border border-border-color/50 card-hover"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className={`w-8 h-8 rounded-lg ${f.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={14} className={f.color} />
              </div>
              <div>
                <p className="text-xs font-semibold text-text-primary mb-0.5">{f.label}</p>
                <p className="text-xs text-text-secondary leading-relaxed">{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Onboarding when no API key
function ApiKeyOnboarding({ onNavigateSettings }: { onNavigateSettings: () => void }) {
  return (
    <div className="bg-bg-card border border-border-color rounded-xl p-8 flex flex-col items-center gap-5 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent-orange/10 border border-accent-orange/20 flex items-center justify-center animate-float">
        <Key size={28} className="text-accent-orange" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-text-primary mb-2">
          Configurá tu API Key de Claude
        </h3>
        <p className="text-xs text-text-secondary max-w-sm leading-relaxed">
          Para usar el análisis con IA necesitás una API key de Anthropic.
          Es gratis empezar y los primeros análisis son muy económicos.
        </p>
      </div>

      <div className="w-full max-w-xs space-y-2">
        {[
          { step: '1', text: 'Visitá console.anthropic.com' },
          { step: '2', text: 'Creá una cuenta o iniciá sesión' },
          { step: '3', text: 'En "API Keys", creá una nueva key' },
          { step: '4', text: 'Pegala en Configuración de la app' },
        ].map(s => (
          <div key={s.step} className="flex items-center gap-3 text-left">
            <span className="w-6 h-6 rounded-full bg-accent-blue/20 border border-accent-blue/30 text-accent-blue text-xs font-bold flex items-center justify-center flex-shrink-0">
              {s.step}
            </span>
            <span className="text-xs text-text-secondary">{s.text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onNavigateSettings}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent-blue text-white hover:bg-blue-500 transition-all duration-200 shadow-lg shadow-accent-blue/20 hover:scale-105 active:scale-95"
      >
        <Key size={14} />
        Ir a Configuración
      </button>
    </div>
  );
}

export const ClaudeAnalysis: React.FC<ClaudeAnalysisProps> = ({
  transactions,
  summary,
  startDate,
  endDate,
  rule502030Mapping,
  onNavigateSettings,
}) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    getSetting('claude_api_key').then(key => {
      setHasApiKey(!!key);
    });
  }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setAnalysis('');

    try {
      const rule = calculateRule502030(transactions, summary?.total_income ?? 0, rule502030Mapping);
      const financialData = exportForClaude(
        transactions,
        summary ?? { total_income: 0, total_expenses: 0, balance: 0, by_category: [] },
        rule,
        startDate,
        endDate
      );

      const result = await analyzeWithClaude(financialData);

      if (result.error) {
        setError(result.error);
        if (result.error.includes('API key')) {
          setHasApiKey(false);
        }
      } else {
        setAnalysis(result.content);
        setHasApiKey(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header card */}
      <div className="bg-bg-card border border-border-color rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-green/20 flex items-center justify-center border border-accent-blue/20">
              <Brain size={20} className="text-accent-blue" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">Análisis con Claude</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Inteligencia artificial para tus finanzas personales
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasApiKey === false && (
              <button
                onClick={onNavigateSettings}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-accent-orange border border-accent-orange/30 hover:bg-accent-orange/10 transition-all duration-150"
              >
                <Key size={12} />
                Configurar API Key
              </button>
            )}
            <button
              onClick={handleAnalyze}
              disabled={loading || transactions.length === 0}
              className="
                flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                bg-gradient-to-r from-accent-blue to-blue-500 text-white
                hover:from-blue-500 hover:to-accent-blue
                transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                shadow-lg shadow-accent-blue/20 hover:scale-105 active:scale-95 disabled:scale-100
              "
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Analizar gastos
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stats preview */}
        {summary && (
          <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-border-color">
            <div className="text-center">
              <p className="text-xs text-text-secondary mb-0.5">Transacciones</p>
              <p className="text-lg font-bold text-text-primary">{transactions.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-secondary mb-0.5">Ingresos</p>
              <p className="text-sm font-bold text-accent-green tabular-nums">${formatARS(summary.total_income)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-secondary mb-0.5">Gastos</p>
              <p className="text-sm font-bold text-accent-red tabular-nums">${formatARS(summary.total_expenses)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-text-secondary mb-0.5">Modelo</p>
              <p className="text-xs font-semibold text-accent-blue mt-0.5">claude-sonnet-4-6</p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-accent-red/10 border border-accent-red/20 rounded-xl p-4 animate-fade-in">
          <AlertCircle size={16} className="text-accent-red flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-accent-red font-semibold">Error al analizar</p>
            <p className="text-xs text-accent-red/80 mt-1">{error}</p>
            {error.includes('API key') && (
              <button
                onClick={onNavigateSettings}
                className="text-xs text-accent-blue underline mt-2 hover:text-blue-400 transition-colors"
              >
                Ir a Configuración para agregar tu API key →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && <RotatingLoader />}

      {/* Analysis result */}
      {analysis && !loading && (
        <div className="bg-bg-card border border-border-color rounded-xl flex-1 overflow-hidden flex flex-col animate-fade-in">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border-color">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              <span className="text-sm font-semibold text-text-primary">Análisis completado</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-all duration-150"
            >
              {copied
                ? <><Check size={12} className="text-accent-green" /> Copiado</>
                : <><Copy size={12} /> Copiar</>
              }
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <div className="markdown-content">
              {renderMarkdown(analysis)}
            </div>
          </div>
        </div>
      )}

      {/* Empty state - no API key */}
      {!analysis && !loading && !error && hasApiKey === false && (
        <ApiKeyOnboarding onNavigateSettings={onNavigateSettings} />
      )}

      {/* Empty state - has API key but no analysis yet */}
      {!analysis && !loading && !error && hasApiKey !== false && (
        <InsightsPreview />
      )}

      {/* No transactions warning */}
      {transactions.length === 0 && !loading && (
        <div className="flex items-center gap-2 text-xs text-accent-orange bg-accent-orange/10 border border-accent-orange/20 rounded-xl px-4 py-3">
          <AlertCircle size={13} />
          <span>Necesitás transacciones en el período seleccionado para realizar el análisis.</span>
        </div>
      )}
    </div>
  );
};
