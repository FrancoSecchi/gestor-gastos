import React, { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, Key, Trash2, AlertCircle, CheckCircle, ExternalLink, Shield, Database, Cpu, Percent, Coins } from 'lucide-react';
import { getRule502030Enabled, setRule502030Enabled, getSetting, setSetting, getReadableError, logError, getErrorLogs } from '../../lib/db';
import { CurrencyCode, CurrencyInfo, SUPPORTED_CURRENCIES } from '../../types';

interface SettingsProps {
  onClearAllData: () => Promise<void>;
  selectedCurrency: CurrencyInfo;
  onCurrencyChange: (code: CurrencyCode) => Promise<void>;
}

export const Settings: React.FC<SettingsProps> = ({
  onClearAllData,
  selectedCurrency,
  onCurrencyChange,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [ruleEnabled, setRuleEnabled] = useState(true);
  const [savingRule, setSavingRule] = useState(false);

  useEffect(() => {
    getSetting('claude_api_key').then(key => {
      if (key) {
        setApiKey(key);
        setHasKey(true);
      }
    });
    getRule502030Enabled().then(enabled => setRuleEnabled(enabled));
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      showMessage('error', 'La API key no puede estar vacía');
      return;
    }
    if (!apiKey.startsWith('sk-ant-')) {
      showMessage('error', 'La API key de Anthropic debe comenzar con "sk-ant-"');
      return;
    }
    setSaving(true);
    try {
      await setSetting('claude_api_key', apiKey.trim());
      setHasKey(true);
      showMessage('success', 'API key guardada correctamente');
    } catch (err) {
      await logError('Settings.handleSaveApiKey', err);
      showMessage('error', getReadableError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleClearData = async () => {
    const confirmed = window.confirm(
      'Esto va a borrar TODA la información guardada (transacciones y configuración). ¿Querés continuar?'
    );
    if (!confirmed) {
      return;
    }

    try {
      await onClearAllData();
      setApiKey('');
      setHasKey(false);
      showMessage('success', 'Toda la base de datos fue limpiada correctamente.');
    } catch (err) {
      await logError('Settings.handleClearData', err);
      showMessage('error', getReadableError(err));
    }
  };

  const handleClearKey = async () => {
    try {
      setApiKey('');
      setHasKey(false);
      await setSetting('claude_api_key', '');
      showMessage('success', 'API key eliminada');
    } catch (err) {
      await logError('Settings.handleClearKey', err);
      showMessage('error', getReadableError(err));
    }
  };

  const handleToggleRule502030 = async () => {
    setSavingRule(true);
    try {
      await setRule502030Enabled(!ruleEnabled);
      setRuleEnabled(prev => !prev);
      showMessage('success', `Regla 50/30/20 ${ruleEnabled ? 'desactivada' : 'activada'}`);
    } catch (err) {
      await logError('Settings.handleToggleRule502030', err);
      showMessage('error', getReadableError(err));
    } finally {
      setSavingRule(false);
    }
  };

  const handleDownloadErrorLog = async () => {
    try {
      const logs = await getErrorLogs(500);
      if (logs.length === 0) {
        showMessage('success', 'No hay errores registrados.');
        return;
      }

      const content = logs
        .map(log => {
          const details = log.details ? `\nDETALLE:\n${log.details}` : '';
          return `[${log.created_at}] (${log.context}) ${log.message}${details}`;
        })
        .join('\n\n---\n\n');

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `errores_gastos_${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage('success', 'Log descargado correctamente.');
    } catch (err) {
      await logError('Settings.handleDownloadErrorLog', err);
      showMessage('error', getReadableError(err));
    }
  };

  const inputClass = `
    w-full bg-bg-secondary border border-border-color rounded-xl px-3 py-2.5 text-sm text-text-primary
    focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20
    placeholder-text-secondary transition-all duration-150
  `;

  return (
    <div className="flex flex-col gap-4 w-full">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Configuración</h2>
        <p className="text-sm text-text-secondary mt-1">Personalizá la aplicación según tus preferencias.</p>
      </div>

      {/* Currency selection */}
      <div className="bg-bg-card border border-border-color rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-green/20 to-accent-blue/20 flex items-center justify-center border border-accent-green/20">
            <Coins size={16} className="text-accent-green" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Moneda local</h3>
            <p className="text-xs text-text-secondary">Elegí la moneda en que registrás tus gastos.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SUPPORTED_CURRENCIES.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => onCurrencyChange(c.code)}
              className={`
                flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-all duration-150 text-left
                ${selectedCurrency.code === c.code
                  ? 'bg-accent-green/10 border-accent-green/40 text-accent-green font-semibold'
                  : 'bg-bg-secondary border-border-color text-text-secondary hover:border-border-color/80 hover:text-text-primary'
                }
              `}
            >
              <span className="text-base leading-none">{c.symbol}</span>
              <div className="min-w-0">
                <p className="font-medium text-xs leading-tight truncate">{c.code}</p>
                <p className="text-xs opacity-70 leading-tight truncate">{c.name}</p>
              </div>
              {selectedCurrency.code === c.code && (
                <CheckCircle size={13} className="ml-auto flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
        {selectedCurrency.code !== 'ARS' && (
          <p className="text-xs text-text-secondary mt-3 bg-bg-secondary rounded-lg px-3 py-2 border border-border-color/50">
            Al usar una moneda distinta del Peso argentino, se ocultan las cotizaciones del dólar y se muestran conversiones entre monedas internacionales.
          </p>
        )}
      </div>

      {/* Regla 50/30/20 */}
      <div className="bg-bg-card border border-border-color rounded-xl p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-purple/20 to-accent-blue/20 flex items-center justify-center border border-accent-purple/20">
            <Percent size={16} className="text-accent-purple" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Regla 50/30/20</h3>
            <p className="text-xs text-text-secondary">Activa o desactiva el seguimiento automático de presupuesto.</p>
          </div>
          <button
            type="button"
            onClick={handleToggleRule502030}
            disabled={savingRule}
            className={`ml-auto rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${ruleEnabled ? 'bg-accent-green text-white hover:bg-green-500' : 'bg-bg-secondary text-text-secondary hover:bg-bg-card'}`}
          >
            {ruleEnabled ? 'Activada' : 'Desactivada'}
          </button>
        </div>
        <p className="text-xs text-text-secondary">
          Si desactivás la regla, la tarjeta de presupuesto en el dashboard desaparecerá, pero podés seguir gestionando metas en la sección correspondiente.
        </p>
      </div>

      <div className="bg-bg-card border border-border-color rounded-xl p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-blue/20 to-accent-green/20 flex items-center justify-center border border-accent-blue/20">
            <Key size={16} className="text-accent-blue" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">API Key de Claude</h3>
            <p className="text-xs text-text-secondary">Necesaria para el análisis con IA</p>
          </div>
          {hasKey && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-accent-green bg-accent-green/10 border border-accent-green/20 rounded-full px-2.5 py-1">
              <CheckCircle size={11} />
              Configurada
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveApiKey}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-accent-blue text-white hover:bg-blue-500 transition-all duration-200 disabled:opacity-50 hover:scale-105 active:scale-95 shadow-lg shadow-accent-blue/20"
            >
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={13} />
              )}
              Guardar API Key
            </button>
            {apiKey && (
              <button
                onClick={handleClearKey}
                className="px-3 py-2 rounded-xl text-sm text-text-secondary hover:text-accent-red border border-border-color hover:border-accent-red/30 transition-all duration-150"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* How to get key */}
          <div className="bg-bg-secondary rounded-xl p-4 border border-border-color/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-text-primary">¿Cómo obtener tu API key?</p>
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-accent-blue hover:text-blue-400 transition-colors"
              >
                console.anthropic.com
                <ExternalLink size={10} />
              </a>
            </div>
            <ol className="space-y-1 text-xs text-text-secondary">
              <li>1. Visitá console.anthropic.com e iniciá sesión</li>
              <li>2. En "API Keys", hacé clic en "Create Key"</li>
              <li>3. Copiá la key y pegala arriba</li>
            </ol>
            <div className="flex items-start gap-2 mt-3 pt-3 border-t border-border-color/50">
              <Shield size={12} className="text-accent-yellow flex-shrink-0 mt-0.5" />
              <p className="text-xs text-accent-yellow leading-relaxed">
                Tu API key se guarda localmente en tu dispositivo y nunca se envía a ningún servidor externo.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-bg-card border border-border-color rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Cpu size={14} className="text-text-secondary" />
          <h3 className="text-sm font-semibold text-text-primary">Acerca de la App</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Versión', value: '0.1.0' },
            { label: 'Framework', value: 'Tauri 2 + React 18' },
            { label: 'Base de datos', value: 'SQLite (local)' },
            { label: 'Modelo IA', value: 'claude-sonnet-4-6' },
            { label: 'Cotizaciones', value: 'dolarapi.com' },
            { label: 'Charts', value: 'Recharts' },
          ].map(item => (
            <div
              key={item.label}
              className="flex items-center justify-between bg-bg-secondary rounded-lg px-3 py-2 border border-border-color/50"
            >
              <span className="text-xs text-text-secondary">{item.label}</span>
              <span className="text-xs font-medium text-text-primary">{item.value}</span>
            </div>
          ))}
        </div>
      </div>


      {/* Danger zone */}
      <div className="bg-bg-card border border-accent-red/15 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database size={14} className="text-accent-red" />
          <h3 className="text-sm font-semibold text-accent-red">Zona de peligro</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-primary">Eliminar todos los datos</p>
            <p className="text-xs text-text-secondary mt-0.5">
              Borra todas las transacciones de forma permanente. Esta acción no se puede deshacer.
            </p>
          </div>
          <button
            onClick={handleClearData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ml-4 border border-accent-red/30 text-accent-red hover:bg-accent-red/10"
          >
            <Trash2 size={13} />
            Eliminar datos
          </button>
        </div>
        <div className="mt-3 pt-3 border-t border-accent-red/10 flex items-center justify-between">
          <p className="text-xs text-text-secondary">
            Descargar historial de errores para diagnóstico
          </p>
          <button
            onClick={handleDownloadErrorLog}
            className="px-3 py-1.5 rounded-lg text-xs border border-border-color text-text-secondary hover:text-text-primary hover:border-text-secondary/30 transition-all duration-150"
          >
            Descargar log
          </button>
        </div>
      </div>

      {/* Message toast inline */}
      {message && (
        <div className={`
          flex items-center gap-2 px-4 py-3 rounded-xl text-sm border animate-fade-in-up
          ${message.type === 'success'
            ? 'bg-accent-green/10 border-accent-green/20 text-accent-green'
            : 'bg-accent-red/10 border-accent-red/20 text-accent-red'
          }
        `}>
          {message.type === 'success'
            ? <CheckCircle size={14} />
            : <AlertCircle size={14} />
          }
          {message.text}
        </div>
      )}
    </div>
  );
};
