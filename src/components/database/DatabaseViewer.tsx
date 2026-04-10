import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, Database, Eye, EyeOff } from 'lucide-react';
import { getTableRows, getTableCount, DbTable } from '../../lib/db';

const TABLES: { id: DbTable; label: string; description: string }[] = [
  { id: 'transactions', label: 'Transacciones', description: 'Todos los movimientos registrados' },
  { id: 'recurring_payments', label: 'Pagos recurrentes', description: 'Plantillas de pagos recurrentes' },
  { id: 'settings', label: 'Configuración', description: 'Clave-valor de ajustes de la app' },
  { id: 'error_logs', label: 'Error logs', description: 'Historial de errores internos' },
];

const PAGE_SIZE = 50;

// Keys whose values should be masked by default
const SENSITIVE_KEYS = new Set(['claude_api_key']);

function maskValue(table: DbTable, row: Record<string, unknown>, key: string): string {
  const val = row[key];
  if (val === null || val === undefined) return 'NULL';
  const str = String(val);
  if (table === 'settings' && key === 'value' && SENSITIVE_KEYS.has(String(row['key']))) {
    return '••••••••••••••••';
  }
  return str;
}

function isMasked(table: DbTable, row: Record<string, unknown>, key: string): boolean {
  return table === 'settings' && key === 'value' && SENSITIVE_KEYS.has(String(row['key']));
}

function CellValue({
  table, row, col,
}: {
  table: DbTable;
  row: Record<string, unknown>;
  col: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const masked = isMasked(table, row, col);
  const display = masked && !revealed ? maskValue(table, row, col) : String(row[col] ?? 'NULL');
  const isNull = row[col] === null || row[col] === undefined;

  return (
    <div className="flex items-center gap-1 min-w-0">
      <span
        className={`truncate max-w-[260px] text-xs ${
          isNull ? 'text-text-secondary/40 italic' : 'text-text-primary'
        }`}
        title={!masked || revealed ? display : undefined}
      >
        {isNull ? 'NULL' : display}
      </span>
      {masked && (
        <button
          type="button"
          onClick={() => setRevealed(r => !r)}
          className="shrink-0 text-text-secondary/50 hover:text-text-secondary transition-colors"
        >
          {revealed ? <EyeOff size={11} /> : <Eye size={11} />}
        </button>
      )}
    </div>
  );
}

export const DatabaseViewer: React.FC = () => {
  const [activeTable, setActiveTable] = useState<DbTable>('transactions');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  const load = useCallback(async (table: DbTable, p: number) => {
    setLoading(true);
    try {
      const [data, total] = await Promise.all([
        getTableRows(table, PAGE_SIZE, p * PAGE_SIZE),
        getTableCount(table),
      ]);
      setRows(data);
      setCount(total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(activeTable, page);
  }, [activeTable, page, load]);

  const switchTable = (table: DbTable) => {
    setActiveTable(table);
    setPage(0);
  };

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Base de datos</h2>
        <p className="text-sm text-text-secondary mt-1">Tablas SQLite locales — solo lectura.</p>
      </div>

      {/* Table selector */}
      <div className="flex gap-2">
        {TABLES.map(t => (
          <button
            key={t.id}
            onClick={() => switchTable(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 ${
              activeTable === t.id
                ? 'bg-accent-blue/15 border-accent-blue/30 text-accent-blue'
                : 'bg-bg-card border-border-color text-text-secondary hover:text-text-primary hover:border-border-color/80'
            }`}
          >
            <Database size={14} />
            <span>{t.label}</span>
            {activeTable === t.id && (
              <span className="bg-accent-blue/20 text-accent-blue text-xs rounded-full px-2 py-0.5 font-semibold tabular-nums">
                {count.toLocaleString()}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={() => load(activeTable, page)}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-color text-sm text-text-secondary hover:text-text-primary hover:bg-bg-card transition-all duration-150 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Table description */}
      <p className="text-xs text-text-secondary -mt-2">
        {TABLES.find(t => t.id === activeTable)?.description} ·{' '}
        <span className="tabular-nums">{count.toLocaleString()} filas</span> ·{' '}
        Página {page + 1} de {totalPages}
      </p>

      {/* Data table */}
      <div className="bg-bg-card border border-border-color rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-text-secondary text-sm gap-2">
            <RefreshCw size={14} className="animate-spin" />
            Cargando…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-text-secondary gap-2">
            <Database size={24} className="opacity-30" />
            <p className="text-sm">Sin registros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-bg-secondary border-b border-border-color sticky top-0">
                <tr>
                  {columns.map(col => (
                    <th
                      key={col}
                      className="text-left px-3 py-2.5 font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-color/40">
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="hover:bg-bg-secondary/40 transition-colors"
                  >
                    {columns.map(col => (
                      <td key={col} className="px-3 py-2 whitespace-nowrap">
                        <CellValue table={activeTable} row={row} col={col} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary tabular-nums">
            Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, count)} de {count.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page === 0}
              className="p-1.5 rounded-lg border border-border-color text-text-secondary hover:text-text-primary hover:bg-bg-card disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i : page < 4 ? i : page > totalPages - 4 ? totalPages - 7 + i : page - 3 + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                    p === page
                      ? 'bg-accent-blue text-white'
                      : 'border border-border-color text-text-secondary hover:text-text-primary hover:bg-bg-card'
                  }`}
                >
                  {p + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page === totalPages - 1}
              className="p-1.5 rounded-lg border border-border-color text-text-secondary hover:text-text-primary hover:bg-bg-card disabled:opacity-30 transition-all"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
