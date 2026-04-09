import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Smile, Pencil, Check } from 'lucide-react';
import { ICON_CATALOG, FALLBACK_ICON } from '../../lib/categoryIcons';
import { ALL_EXPENSE_CATEGORIES, ALL_INCOME_CATEGORIES } from '../../types';

interface CategoryEditorProps {
  expenseCategories: string[];
  incomeCategories: string[];
  customExpenseCategories: string[];
  customIncomeCategories: string[];
  icons: Record<string, string>;
  onSetIcon: (category: string, icon: string) => Promise<void>;
  onAddExpense: (name: string) => Promise<void>;
  onAddIncome: (name: string) => Promise<void>;
  onRemoveExpense: (name: string) => Promise<void>;
  onRemoveIncome: (name: string) => Promise<void>;
  onRenameExpense: (oldName: string, newName: string) => Promise<void>;
  onRenameIncome: (oldName: string, newName: string) => Promise<void>;
}

// ── Icon Picker ────────────────────────────────────────────────────────────────

interface IconPickerProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onSelect: (icon: string) => void;
  onClose: () => void;
}

const PICKER_W = 288;
const PICKER_H = 320;

function IconPicker({ anchorRef, onSelect, onClose }: IconPickerProps) {
  const [activeGroup, setActiveGroup] = useState(ICON_CATALOG[0].group);
  const pickerRef = useRef<HTMLDivElement>(null);

  const rect = anchorRef.current?.getBoundingClientRect();
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 0;
  const top = rect
    ? spaceBelow >= PICKER_H
      ? rect.bottom + 6
      : rect.top - PICKER_H - 6
    : 0;
  const left = rect
    ? Math.min(rect.left, window.innerWidth - PICKER_W - 8)
    : 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [anchorRef, onClose]);

  const currentIcons = ICON_CATALOG.find(g => g.group === activeGroup)?.icons ?? [];

  return createPortal(
    <div
      ref={pickerRef}
      style={{ position: 'fixed', top, left, width: PICKER_W, zIndex: 9999 }}
      className="bg-bg-card border border-border-color rounded-2xl shadow-2xl animate-fade-in flex flex-col"
    >
      {/* Group tabs */}
      <div className="flex gap-1 p-2 overflow-x-auto border-b border-border-color shrink-0 no-scrollbar">
        {ICON_CATALOG.map(g => (
          <button
            key={g.group}
            type="button"
            onClick={() => setActiveGroup(g.group)}
            className={`px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeGroup === g.group
                ? 'bg-accent-blue text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
            }`}
          >
            {g.group}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="grid grid-cols-7 gap-0.5 p-2 overflow-y-auto" style={{ maxHeight: PICKER_H - 72 }}>
        {currentIcons.map(icon => (
          <button
            key={icon}
            type="button"
            onClick={() => { onSelect(icon); onClose(); }}
            className="h-9 w-full flex items-center justify-center text-lg rounded-lg hover:bg-bg-secondary transition-colors"
            title={icon}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}

// ── Category Row ───────────────────────────────────────────────────────────────

interface CategoryRowProps {
  name: string;
  icon: string;
  isCustom: boolean;
  onSetIcon: (icon: string) => void;
  onRemove?: () => void;
  onRename?: (newName: string) => Promise<void>;
}

function CategoryRow({ name, icon, isCustom, onSetIcon, onRemove, onRename }: CategoryRowProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const startEdit = () => {
    setEditValue(name);
    setRenameError(null);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const cancelEdit = () => {
    setEditing(false);
    setRenameError(null);
  };

  const commitEdit = async () => {
    const trimmed = editValue.trim();
    if (trimmed === name) { setEditing(false); return; }
    if (!trimmed) { setRenameError('El nombre no puede estar vacío'); return; }
    setSaving(true);
    try {
      await onRename!(trimmed);
      setEditing(false);
      setRenameError(null);
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Error al renombrar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-bg-secondary/50 group">
        {/* Icon button */}
        <button
          ref={btnRef}
          type="button"
          onClick={() => setPickerOpen(o => !o)}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border-color bg-bg-secondary hover:border-accent-blue/50 transition-colors text-lg shrink-0"
          title="Cambiar ícono"
        >
          {icon}
        </button>

        {pickerOpen && (
          <IconPicker
            anchorRef={btnRef}
            onSelect={onSetIcon}
            onClose={() => setPickerOpen(false)}
          />
        )}

        {/* Name or inline editor */}
        {isCustom && editing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={e => { setEditValue(e.target.value); setRenameError(null); }}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
              if (e.key === 'Escape') cancelEdit();
            }}
            disabled={saving}
            className="flex-1 bg-bg-secondary border border-accent-blue/50 rounded-lg px-2 py-0.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/30"
          />
        ) : (
          <span className="flex-1 text-sm text-text-primary">{name}</span>
        )}

        {/* Actions */}
        {isCustom ? (
          <div className="flex items-center gap-1">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={commitEdit}
                  disabled={saving}
                  className="p-1 rounded hover:bg-accent-green/15 text-text-secondary hover:text-accent-green transition-colors disabled:opacity-50"
                  title="Confirmar"
                >
                  <Check size={13} />
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="p-1 rounded hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors"
                  title="Cancelar"
                >
                  <X size={13} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={startEdit}
                  className="p-1 rounded hover:bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors opacity-0 group-hover:opacity-100"
                  title="Renombrar"
                >
                  <Pencil size={12} />
                </button>
                {onRemove && (
                  <button
                    type="button"
                    onClick={onRemove}
                    className="p-1 rounded hover:bg-accent-red/15 text-text-secondary hover:text-accent-red transition-colors opacity-0 group-hover:opacity-100"
                    title="Eliminar categoría"
                  >
                    <X size={13} />
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <span className="text-xs text-text-secondary/40 hidden group-hover:flex items-center gap-1">
            <Smile size={11} />
            ícono editable
          </span>
        )}
      </div>
      {renameError && (
        <p className="text-xs text-accent-red pl-12 pb-1">{renameError}</p>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export const CategoryEditor: React.FC<CategoryEditorProps> = ({
  expenseCategories,
  incomeCategories,
  customExpenseCategories,
  customIncomeCategories,
  icons,
  onSetIcon,
  onAddExpense,
  onAddIncome,
  onRemoveExpense,
  onRemoveIncome,
  onRenameExpense,
  onRenameIncome,
}) => {
  const [tab, setTab] = useState<'expense' | 'income'>('expense');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = tab === 'expense' ? expenseCategories : incomeCategories;
  const customSet = new Set(
    tab === 'expense' ? customExpenseCategories : customIncomeCategories
  );
  const builtIn = tab === 'expense' ? ALL_EXPENSE_CATEGORIES : ALL_INCOME_CATEGORIES;
  const builtInSet = new Set(builtIn);

  const handleAdd = useCallback(async () => {
    const name = newName.trim();
    if (!name) { setError('Escribí un nombre'); return; }
    setError(null);
    setAdding(true);
    try {
      if (tab === 'expense') await onAddExpense(name);
      else await onAddIncome(name);
      setNewName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar');
    } finally {
      setAdding(false);
    }
  }, [newName, tab, onAddExpense, onAddIncome]);

  const handleRemove = useCallback(async (name: string) => {
    if (tab === 'expense') await onRemoveExpense(name);
    else await onRemoveIncome(name);
  }, [tab, onRemoveExpense, onRemoveIncome]);

  const inputClass = `
    w-full bg-bg-secondary border border-border-color rounded-xl px-3 py-2 text-sm text-text-primary
    focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/20
    placeholder-text-secondary transition-all duration-150
  `;

  return (
    <div className="flex flex-col gap-3">
      {/* Tabs */}
      <div className="flex gap-1 bg-bg-secondary rounded-xl p-1 w-fit">
        {(['expense', 'income'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setNewName(''); setError(null); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              tab === t
                ? t === 'expense'
                  ? 'bg-accent-red/20 text-accent-red border border-accent-red/30'
                  : 'bg-accent-green/20 text-accent-green border border-accent-green/30'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t === 'expense' ? '↓ Gastos' : '↑ Ingresos'}
          </button>
        ))}
      </div>

      {/* Category list */}
      <div className="max-h-72 overflow-y-auto rounded-xl border border-border-color divide-y divide-border-color/40">
        {/* Built-in first */}
        {builtIn.filter(c => categories.includes(c)).map(name => (
          <CategoryRow
            key={name}
            name={name}
            icon={icons[name] ?? FALLBACK_ICON}
            isCustom={false}
            onSetIcon={icon => onSetIcon(name, icon)}
          />
        ))}

        {/* Custom */}
        {categories.filter(c => !builtInSet.has(c as never)).map(name => (
          <CategoryRow
            key={name}
            name={name}
            icon={icons[name] ?? FALLBACK_ICON}
            isCustom={customSet.has(name)}
            onSetIcon={icon => onSetIcon(name, icon)}
            onRemove={() => handleRemove(name)}
            onRename={newName =>
              tab === 'expense' ? onRenameExpense(name, newName) : onRenameIncome(name, newName)
            }
          />
        ))}

        {categories.length === 0 && (
          <p className="text-xs text-text-secondary italic p-4">Sin categorías</p>
        )}
      </div>

      {/* Add new */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => { setNewName(e.target.value); setError(null); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          placeholder={`Nueva categoría de ${tab === 'expense' ? 'gasto' : 'ingreso'}…`}
          className={`${inputClass} flex-1`}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium bg-bg-secondary border border-border-color text-text-primary hover:border-accent-blue/40 shrink-0 disabled:opacity-50"
        >
          <Plus size={13} />
          Agregar
        </button>
      </div>

      {error && (
        <p className="text-xs text-accent-red">{error}</p>
      )}

      <p className="text-xs text-text-secondary/60">
        Hacé clic en el ícono de cualquier categoría para cambiarlo.
        Las categorías built-in no se pueden eliminar pero sí personalizar su ícono.
      </p>
    </div>
  );
};
