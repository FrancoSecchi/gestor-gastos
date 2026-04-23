import React, { useState, useCallback, useEffect, Component, ErrorInfo, ReactNode, lazy, Suspense } from 'react';
import { Sidebar, ActiveView } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { SummaryCards } from './components/dashboard/SummaryCards';
import { ExpenseChart } from './components/dashboard/ExpenseChart';
import { BudgetTabsWidget } from './components/dashboard/BudgetTabsWidget';
import { DollarRate } from './components/dashboard/DollarRate';
import { ExchangeRateCard } from './components/dashboard/ExchangeRateCard';
import { RecurringPaymentsWidget } from './components/dashboard/RecurringPaymentsWidget';
import { InsightsWidget } from './components/dashboard/InsightsWidget';
import { RecentTransactions } from './components/dashboard/RecentTransactions';
import { TransactionFilters } from './components/transactions/TransactionFilters';
import { ToastProvider, useToast } from './components/ui/Toast';

// Lazy load heavy components
const ClaudeAnalysis = lazy(() => import('./components/analysis/ClaudeAnalysis').then(m => ({ default: m.ClaudeAnalysis })));
const DatabaseViewer = lazy(() => import('./components/database/DatabaseViewer').then(m => ({ default: m.DatabaseViewer })));
const HousingView = lazy(() => import('./components/housing/HousingView').then(m => ({ default: m.HousingView })));
const TransactionList = lazy(() => import('./components/transactions/TransactionList').then(m => ({ default: m.TransactionList })));
const TransactionForm = lazy(() => import('./components/transactions/TransactionForm').then(m => ({ default: m.TransactionForm })));
const Settings = lazy(() => import('./components/settings/Settings').then(m => ({ default: m.Settings })));
const CategoriesView = lazy(() => import('./components/categories/CategoriesView').then(m => ({ default: m.CategoriesView })));
const BudgetRuleView = lazy(() => import('./components/budget-rule/BudgetRuleView').then(m => ({ default: m.BudgetRuleView })));
const SavingsView = lazy(() => import('./components/savings/SavingsView').then(m => ({ default: m.SavingsView })));
import { CategoriesProvider } from './contexts/CategoriesContext';
import { useCategoriesContext } from './hooks/useCategoriesContext';
import { useTransactions } from './hooks/useTransactions';
import { useRecurringPayments, getCurrentPeriodRange } from './hooks/useRecurringPayments';
import { useSavings } from './hooks/useSavings';
import { useSavingsGoals } from './hooks/useSavingsGoals';
import { deleteReceiptFile } from './lib/receiptUtils';
import { useDollarRate } from './hooks/useDollarRate';
import { useExchangeRates } from './hooks/useExchangeRates';
import { useFilters } from './hooks/useFilters';
import { CurrencyProvider, useCurrencyFormat } from './contexts/CurrencyContext';
import { Transaction, NewTransaction, RecurringPayment, RecurrenceFrequency, RECURRENCE_LABELS } from './types';
import { exportToExcel, exportForClaude } from './lib/export';
import { getReadableError, logError, getTransactions, getAllTransactions, createRecurringPayment, getRule502030Enabled, setRule502030Enabled } from './lib/db';
import { calculateRule502030 } from './lib/budgetRule';
import {
  getDefaultRule502030Mapping,
  ensureMappingCoversCategories,
} from './lib/budgetRuleMapping';
import { useRule502030Mapping } from './hooks/useBudgetRuleMapping';
import { useHousingContract } from './hooks/useHousingContract';
import { format, startOfMonth, endOfMonth, subMonths, parseISO, differenceInDays } from 'date-fns';
import { ChevronDown } from 'lucide-react';

const VIEW_TITLES: Record<ActiveView, string> = {
  dashboard: 'Inicio',
  transactions: 'Movimientos',
  analysis: 'Análisis con IA',
  categories: 'Categorías',
  budgetRule: 'Metas',
  housing: 'Vivienda',
  savings: 'Ahorros',
  settings: 'Ajustes',
  database: 'Base de datos',
};

// Collapsible card component for dashboard
interface CollapsibleCardProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({ title, isOpen, onToggle, children }) => (
  <div className="border border-border-color rounded-xl bg-bg-card overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-3 hover:bg-bg-secondary/50"
    >
      <h3 className="font-semibold text-text-primary text-sm">{title}</h3>
      <ChevronDown
        size={16}
        className={`text-text-secondary transition-transform duration-200 ${
          isOpen ? 'transform rotate-180' : ''
        }`}
      />
    </button>
    <div
      className="overflow-hidden"
      style={{
        maxHeight: isOpen ? '1000px' : '0',
        opacity: isOpen ? 1 : 0,
      }}
    >
      <div className="px-5 py-4 border-t border-border-color/30">{children}</div>
    </div>
  </div>
);

class HousingErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[HousingView] Error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
          <p className="text-sm font-semibold text-accent-red">Error al cargar la sección Vivienda</p>
          <p className="text-xs text-text-secondary max-w-sm">{this.state.error}</p>
          <button
            className="text-xs px-3 py-1.5 rounded-lg border border-border-color text-text-secondary hover:text-text-primary transition-colors"
            onClick={() => this.setState({ hasError: false, error: '' })}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const TRANSACTIONS_TOOLTIP = (
  <div className="space-y-3">
    <div>
      <p className="font-semibold text-text-primary mb-1">Agregar transacciones</p>
      <p>Usá el botón <span className="text-text-primary font-medium">+ Nueva</span> para registrar un ingreso, gasto o transferencia a ahorro. Podés adjuntar un comprobante (PDF o imagen) en el formulario.</p>
    </div>
    <div>
      <p className="font-semibold text-text-primary mb-1">Filtros y segmentación</p>
      <ul className="space-y-0.5 pl-2">
        <li><span className="text-text-primary font-medium">Fecha</span> — filtrá por semana, mes, trimestre, año o rango personalizado.</li>
        <li><span className="text-text-primary font-medium">Tipo</span> — mostrá solo gastos, solo ingresos, o todos.</li>
        <li><span className="text-text-primary font-medium">Categoría</span> — tocá cualquier categoría para ver solo esas transacciones.</li>
      </ul>
    </div>
    <div>
      <p className="font-semibold text-text-primary mb-1">Filtros rápidos</p>
      <ul className="space-y-0.5 pl-2">
        <li><span className="text-text-primary font-medium">↺ Recurrentes</span> — solo transacciones vinculadas a un pago recurrente.</li>
        <li><span className="text-text-primary font-medium">⇆ Ahorros</span> — solo transferencias hacia o desde tus ahorros.</li>
        <li><span className="text-text-primary font-medium">📎 Con comprobante</span> — solo las que tienen archivo adjunto.</li>
      </ul>
    </div>
    <div>
      <p className="font-semibold text-text-primary mb-1">Pagos recurrentes</p>
      <p>Al hacer hover en una fila aparece el ícono <span className="text-text-primary font-medium">↺</span>. Si la transacción no es recurrente, podés marcarla eligiendo la frecuencia. Si ya lo es, el mismo ícono te permite desmarcarla.</p>
    </div>
    <div>
      <p className="font-semibold text-text-primary mb-1">Comprobantes</p>
      <p>Si una transacción tiene archivo adjunto, aparece el ícono <span className="text-text-primary font-medium">📎</span> en la fila. Tocalo para verlo.</p>
    </div>
    <div>
      <p className="font-semibold text-text-primary mb-1">Exportar</p>
      <p><span className="text-text-primary font-medium">Excel</span> descarga las transacciones del período en una planilla. <span className="text-text-primary font-medium">Markdown</span> genera un resumen para analizar con IA.</p>
    </div>
  </div>
);

function AppInner() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [formInitialType, setFormInitialType] = useState<'income' | 'expense' | undefined>(undefined);
  const [recurringTemplate, setRecurringTemplate] = useState<RecurringPayment | null>(null);

  // Dashboard collapsible cards state
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({
    filters: true,
    summary: true,
    charts: true,
    recurring: true,
  });

  const toggleCard = useCallback((cardId: string) => {
    setExpandedCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
  }, []);

  // Current month transactions for the recurring payments widget
  const [currentMonthTransactions, setCurrentMonthTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  const { filters, dateRange, setDateFilter, setCustomRange, setTypeFilter, setCategoryFilter, toggleQuickFilter } = useFilters();
  const { transactions, summary, loading, addTransaction, editTransaction, removeTransaction, clearDatabase, refresh: refreshTransactions } = useTransactions(
    dateRange.start,
    dateRange.end
  );
  const { rates, loading: dollarLoading, error: dollarError, lastUpdate, refresh: refreshDollar } = useDollarRate();
  const { currency: selectedCurrency, setCurrency } = useCurrencyFormat();
  const { rates: exchangeRates, loading: exchangeLoading, error: exchangeError, lastUpdate: exchangeLastUpdate, refresh: refreshExchange } = useExchangeRates(selectedCurrency.code);
  const {
    expenseCategories,
    incomeCategories,
    categoryIcons,
    setCategoryIcon,
    addExpense: addCustomExpenseCategory,
    addIncome: addCustomIncomeCategory,
    removeExpense: removeCustomExpenseCategory,
    removeIncome: removeCustomIncomeCategory,
    renameExpense: renameCustomExpenseCategory,
    renameIncome: renameCustomIncomeCategory,
  } = useCategoriesContext();
  const { contract: housingContract, loading: housingLoading, hasRentalContract, setHasRental, save: saveHousingContract, remove: removeHousingContract } = useHousingContract();
  const { recurringPayments, refresh: refreshRecurring, toggleRecurring, removeRecurring } = useRecurringPayments();

  // Previous period transactions for InsightsWidget
  const [previousTransactions, setPreviousTransactions] = useState<Transaction[]>([]);
  const previousDateRange = React.useMemo(() => {
    if (filters.dateFilter === 'current_month') {
      const prev = subMonths(new Date(), 1);
      return {
        start: format(startOfMonth(prev), 'yyyy-MM-dd'),
        end: format(endOfMonth(prev), 'yyyy-MM-dd'),
      };
    }
    if (filters.dateFilter === 'last_month') {
      const prev = subMonths(new Date(), 2);
      return {
        start: format(startOfMonth(prev), 'yyyy-MM-dd'),
        end: format(endOfMonth(prev), 'yyyy-MM-dd'),
      };
    }
    // For other filters: shift the same duration back
    try {
      const start = parseISO(dateRange.start);
      const end = parseISO(dateRange.end);
      const days = differenceInDays(end, start) + 1;
      const prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);
      const prevStart = new Date(prevEnd);
      prevStart.setDate(prevStart.getDate() - days + 1);
      return {
        start: format(prevStart, 'yyyy-MM-dd'),
        end: format(prevEnd, 'yyyy-MM-dd'),
      };
    } catch {
      return { start: dateRange.start, end: dateRange.end };
    }
  }, [filters.dateFilter, dateRange.start, dateRange.end]);

  useEffect(() => {
    if (activeView !== 'dashboard') return;

    let cancelled = false;

    getTransactions(previousDateRange.start, previousDateRange.end)
      .then(txs => {
        if (!cancelled) setPreviousTransactions(txs);
      })
      .catch(() => {
        if (!cancelled) setPreviousTransactions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [activeView, previousDateRange.start, previousDateRange.end]);

  // Projected balance (only for current_month, min 3 days elapsed)
  const projectedBalance = React.useMemo(() => {
    if (filters.dateFilter !== 'current_month') return null;
    const today = new Date();
    const daysElapsed = today.getDate();
    if (daysElapsed < 3) return null;
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return ((summary?.balance ?? 0) / daysElapsed) * daysInMonth;
  }, [summary?.balance, filters.dateFilter]);

  // Pending recurring amount
  const pendingRecurringAmount = React.useMemo(() => {
    if (!recurringPayments?.length) return 0;
    return recurringPayments
      .filter(rp => rp.is_active === 1)
      .filter(rp => {
        const { start, end } = getCurrentPeriodRange(rp.frequency);
        return !currentMonthTransactions.some(
          t => t.recurring_id === rp.id && t.date >= start && t.date <= end
        );
      })
      .reduce((sum, rp) => sum + rp.amount, 0);
  }, [recurringPayments, currentMonthTransactions]);

  // Month progress for dashboard filter bar
  const monthProgress = React.useMemo(() => {
    if (filters.dateFilter !== 'current_month') return undefined;
    const today = new Date();
    return {
      day: today.getDate(),
      totalDays: new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(),
      spent: summary?.total_expenses ?? 0,
      income: summary?.total_income ?? 0,
    };
  }, [filters.dateFilter, summary]);

  const refreshCurrentMonthTransactions = useCallback(async () => {
    const now = new Date();
    const start = format(startOfMonth(now), 'yyyy-MM-dd');
    const end = format(endOfMonth(now), 'yyyy-MM-dd');
    const txs = await getTransactions(start, end);
    setCurrentMonthTransactions(txs);
  }, []);

  const refreshAllTransactions = useCallback(async () => {
    const txs = await getAllTransactions();
    setAllTransactions(txs);
  }, []);

  useEffect(() => {
    refreshCurrentMonthTransactions();
  }, [refreshCurrentMonthTransactions]);

  useEffect(() => {
    refreshAllTransactions().catch(() => {});
  }, [refreshAllTransactions]);

  const {
    mapping: rule502030Mapping,
    percentages: rule502030Percentages,
    updateMapping: updateRule502030Mapping,
    updatePercentages: updateRule502030Percentages,
    refresh: refreshRule502030Mapping,
  } = useRule502030Mapping(expenseCategories);
  const toast = useToast();

  const effectiveRule502030Mapping = rule502030Mapping ?? getDefaultRule502030Mapping();

  const [rule502030Enabled, setRule502030EnabledState] = useState(true);

  const {
    goals: savingsGoals,
    loading: savingsGoalsLoading,
    addGoal,
    updateGoal,
    removeGoal,
  } = useSavingsGoals();

  const { data: ahorrosData } = useSavings(rule502030Mapping);
  const totalSavings = ahorrosData?.totalSavings ?? 0;
  const streakMonths = ahorrosData?.streakMonths ?? 0;

  useEffect(() => {
    getRule502030Enabled()
      .then(setRule502030EnabledState)
      .catch(err => {
        console.error('Error loading rule 50/30/20 enabled flag:', err);
        setRule502030EnabledState(true);
      });
  }, []);

  const toggleRule502030 = useCallback(async (enabled: boolean) => {
    try {
      await setRule502030Enabled(enabled);
      setRule502030EnabledState(enabled);
    } catch (err) {
      await logError('App.toggleRule502030', err);
    }
  }, []);

  const handleAddCustomCategory = useCallback(
    async (type: 'expense' | 'income', name: string) => {
      if (type === 'expense') {
        await addCustomExpenseCategory(name);
      } else {
        await addCustomIncomeCategory(name);
      }
    },
    [addCustomExpenseCategory, addCustomIncomeCategory]
  );

  const handleRenameExpenseCategory = useCallback(
    async (oldName: string, newName: string) => {
      await renameCustomExpenseCategory(oldName, newName);
      await refreshTransactions(dateRange.start, dateRange.end);
    },
    [renameCustomExpenseCategory, refreshTransactions, dateRange.start, dateRange.end]
  );

  const handleRenameIncomeCategory = useCallback(
    async (oldName: string, newName: string) => {
      await renameCustomIncomeCategory(oldName, newName);
      await refreshTransactions(dateRange.start, dateRange.end);
    },
    [renameCustomIncomeCategory, refreshTransactions, dateRange.start, dateRange.end]
  );

  const handleSaveTransaction = useCallback(async (tx: NewTransaction | Transaction, recurringFrequency?: RecurrenceFrequency) => {
    const isEdit = 'id' in tx;
    try {
      if (isEdit) {
        let txToEdit = tx as Transaction;
        if (recurringFrequency && !txToEdit.recurring_id) {
          // Se activó recurrente al editar — crear el recurrente y linkear
          const recurring = await createRecurringPayment({
            type: txToEdit.type,
            amount: txToEdit.amount,
            category: txToEdit.category,
            subcategory: txToEdit.subcategory,
            description: txToEdit.description,
            frequency: recurringFrequency,
          });
          txToEdit = { ...txToEdit, recurring_id: recurring.id };
        }
        await editTransaction(txToEdit);
        await refreshAllTransactions();
        toast.success('Transacción actualizada', 'Los cambios fueron guardados correctamente.');
      } else {
        let txToSave = tx as NewTransaction;
        let createdRecurring = false;
        if (recurringFrequency && !txToSave.recurring_id) {
          // Create the recurring payment first, then link the transaction
          const recurring = await createRecurringPayment({
            type: txToSave.type,
            amount: txToSave.amount,
            category: txToSave.category,
            subcategory: txToSave.subcategory,
            description: txToSave.description,
            frequency: recurringFrequency,
          });
          txToSave = { ...txToSave, recurring_id: recurring.id };
          createdRecurring = true;
          toast.success('Pago recurrente creado', `Se guardó como ${RECURRENCE_LABELS[recurringFrequency].toLowerCase()}.`);
        }
        await addTransaction(txToSave);
        await refreshAllTransactions();
        if (!recurringFrequency) {
          toast.success('Transacción agregada', `Se registró ${tx.type === 'income' ? 'el ingreso' : 'el gasto'} exitosamente.`);
        }
        // Si se creó un pago recurrente, hacer refresh en paralelo de todo lo necesario
        if (createdRecurring) {
          await Promise.all([
            refreshRecurring(),
            refreshCurrentMonthTransactions(),
            refreshTransactions(dateRange.start, dateRange.end),
          ]);
        } else {
          await refreshCurrentMonthTransactions();
        }
      }
      // Si fue edición sin crear recurrente, solo refrescar mes actual
      if (isEdit) {
      await refreshCurrentMonthTransactions();
    }
  } catch (err) {
      await logError('App.handleSaveTransaction', err);
      toast.error('Error al guardar', getReadableError(err));
      throw err;
    }
  }, [addTransaction, editTransaction, toast, refreshRecurring, refreshCurrentMonthTransactions, refreshTransactions, refreshAllTransactions, dateRange.start, dateRange.end]);

  const handleUnmarkRecurring = useCallback(async (tx: Transaction) => {
    try {
      await editTransaction({ ...tx, recurring_id: null });
      await Promise.all([
        refreshTransactions(dateRange.start, dateRange.end),
        refreshAllTransactions(),
      ]);
      toast.success('Recurrente eliminado', 'La transacción ya no está vinculada a ningún pago recurrente.');
    } catch (err) {
      await logError('App.handleUnmarkRecurring', err);
      toast.error('Error', getReadableError(err));
    }
  }, [editTransaction, refreshTransactions, refreshAllTransactions, dateRange.start, dateRange.end, toast]);

  const handleMarkRecurring = useCallback(async (tx: Transaction, frequency: RecurrenceFrequency) => {
    try {
      const recurring = await createRecurringPayment({
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        subcategory: tx.subcategory,
        description: tx.description,
        frequency,
      });
      await editTransaction({ ...tx, recurring_id: recurring.id });
      await Promise.all([
        refreshRecurring(),
        refreshTransactions(dateRange.start, dateRange.end),
        refreshCurrentMonthTransactions(),
        refreshAllTransactions(),
      ]);
      toast.success('Pago recurrente creado', `Marcado como ${RECURRENCE_LABELS[frequency].toLowerCase()}.`);
    } catch (err) {
      await logError('App.handleMarkRecurring', err);
      toast.error('Error', getReadableError(err));
    }
  }, [editTransaction, refreshRecurring, refreshTransactions, refreshCurrentMonthTransactions, refreshAllTransactions, dateRange.start, dateRange.end, toast]);

  const handleEdit = useCallback((tx: Transaction) => {
    setEditingTx(tx);
    setShowForm(true);
  }, []);

  const handleOpenForm = useCallback(() => {
    setFormInitialType(undefined);
    setShowForm(true);
  }, []);

  const handleOpenFormWithType = useCallback((type: 'income' | 'expense') => {
    setFormInitialType(type);
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingTx(null);
    setFormInitialType(undefined);
    setRecurringTemplate(null);
  }, []);

  const handleRegisterRecurringPayment = useCallback((recurring: RecurringPayment) => {
    setEditingTx(null);
    setFormInitialType(undefined);
    setRecurringTemplate(recurring);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const confirmed = window.confirm('¿Seguro que querés eliminar esta transacción?');
    if (!confirmed) return;

    try {
      const tx = transactions.find(t => t.id === id);
      if (tx?.receipt_path) await deleteReceiptFile(tx.receipt_path);
      await removeTransaction(id);
      await refreshAllTransactions();
      toast.success('Transacción eliminada', 'La transacción fue eliminada correctamente.');
    } catch (err) {
      await logError('App.handleDelete', err);
      toast.error('Error al eliminar', getReadableError(err));
    }
  }, [removeTransaction, refreshAllTransactions, transactions, toast]);

  const handleClearAllData = useCallback(async () => {
    try {
      await clearDatabase();
      await Promise.all([
        refreshRule502030Mapping(),
        refreshAllTransactions(),
      ]);
      toast.success('Base de datos limpiada', 'Se eliminó toda la información guardada.');
    } catch (err) {
      await logError('App.handleClearAllData', err);
      toast.error('Error al limpiar', getReadableError(err));
      throw err;
    }
  }, [clearDatabase, refreshRule502030Mapping, refreshAllTransactions, toast]);

  const handleExportExcel = useCallback(async () => {
    if (!summary) return;
    try {
      await exportToExcel(transactions, summary, dateRange.start, dateRange.end);
      toast.success('Exportación exitosa', 'El archivo Excel fue generado correctamente.');
    } catch (err) {
      console.error('Error exporting Excel:', err);
      toast.error('Error al exportar', 'No se pudo generar el archivo Excel.');
    }
  }, [transactions, summary, dateRange, toast]);

  const handleExportClaude = useCallback(async () => {
    if (!summary) return;
    try {
      const rule = calculateRule502030(transactions, summary.total_income, effectiveRule502030Mapping, rule502030Percentages);
      const content = exportForClaude(transactions, summary, rule, dateRange.start, dateRange.end);
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analisis_financiero_${dateRange.start}_${dateRange.end}.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exportación exitosa', 'El archivo Markdown fue descargado correctamente.');
    } catch (err) {
      console.error('Error exporting for Claude:', err);
      toast.error('Error al exportar', 'No se pudo generar el archivo.');
    }
  }, [transactions, summary, dateRange, toast, effectiveRule502030Mapping]);
  return (
    <div className="flex h-full bg-bg-primary overflow-hidden">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        transactionCount={transactions.length}
        isARS={selectedCurrency.code === 'ARS'}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={VIEW_TITLES[activeView]}
          tooltipContent={activeView === 'transactions' ? TRANSACTIONS_TOOLTIP : undefined}
          dollarRates={rates}
          dollarLoading={dollarLoading}
          dollarError={dollarError}
          lastUpdate={lastUpdate}
          onRefreshDollar={refreshDollar}
          summary={summary}
          selectedCurrency={selectedCurrency}
        />

        <main className="flex-1 overflow-y-auto p-5">
          {activeView === 'dashboard' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* Filters - Collapsible */}
              
                <TransactionFilters
                  filters={filters}
                  dateRange={dateRange}
                  expenseCategories={expenseCategories}
                  incomeCategories={incomeCategories}
                  onDateFilter={setDateFilter}
                  onCustomRange={setCustomRange}
                  onTypeFilter={setTypeFilter}
                  onCategoryFilter={setCategoryFilter}
                  onToggleQuickFilter={toggleQuickFilter}
                  showSegmentation={false}
                  monthProgress={monthProgress}
                />

              {/* Summary Cards */}
              <SummaryCards
                summary={summary}
                loading={loading}
                onOpenForm={handleOpenFormWithType}
                dateRange={dateRange}
                pendingRecurringAmount={pendingRecurringAmount}
                totalSavings={totalSavings}
                projectedBalance={projectedBalance}
              />
              
              {/* Charts + Rule 502030 */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-7 flex flex-col gap-4">
                  <InsightsWidget
                    currentTransactions={transactions}
                    previousTransactions={previousTransactions}
                    totalIncome={summary?.total_income ?? 0}
                    totalSavings={totalSavings}
                    streakMonths={streakMonths}
                    projectedBalance={projectedBalance}
                  />
                  <ExpenseChart
                    transactions={transactions}
                    byCategory={summary?.by_category ?? []}
                  />
                  <RecentTransactions
                    transactions={transactions}
                    categoryIcons={categoryIcons}
                    onViewAll={() => setActiveView('transactions')}
                  />
                </div>
                <div className="col-span-5 flex flex-col gap-4">
                  <BudgetTabsWidget
                    transactions={transactions}
                    totalIncome={summary?.total_income ?? 0}
                    mapping={effectiveRule502030Mapping}
                    percentages={rule502030Percentages}
                    savingsGoals={savingsGoals}
                    onNavigateGoals={() => setActiveView('budgetRule')}
                    showBudgetTab={rule502030Enabled}
                    allTransactions={allTransactions}
                  />
                  {recurringPayments?.length > 0 && (
                    <RecurringPaymentsWidget
                      recurringPayments={recurringPayments}
                      currentMonthTransactions={currentMonthTransactions}
                      categoryIcons={categoryIcons}
                      onRegisterPayment={handleRegisterRecurringPayment}
                      onDeleteRecurring={removeRecurring}
                      onToggleRecurring={toggleRecurring}
                    />
                  )}
                  {selectedCurrency.code === 'ARS' ? (
                    <DollarRate
                      rates={rates}
                      loading={dollarLoading}
                      error={dollarError}
                      lastUpdate={lastUpdate}
                      onRefresh={refreshDollar}
                    />
                  ) : (
                    <ExchangeRateCard
                      currency={selectedCurrency}
                      rates={exchangeRates}
                      loading={exchangeLoading}
                      error={exchangeError}
                      lastUpdate={exchangeLastUpdate}
                      onRefresh={refreshExchange}
                    />
                  )}
                </div>
              </div>


              
              {/* Extra space for scrolling */}
              <div className="h-4" />
            </div>
          )}

          {activeView === 'transactions' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <TransactionFilters
                filters={filters}
                dateRange={dateRange}
                expenseCategories={expenseCategories}
                incomeCategories={incomeCategories}
                onDateFilter={setDateFilter}
                onCustomRange={setCustomRange}
                onTypeFilter={setTypeFilter}
                onCategoryFilter={setCategoryFilter}
                onToggleQuickFilter={toggleQuickFilter}
              />
              <div className="flex-1 overflow-hidden">
                <Suspense fallback={<div className="flex items-center justify-center h-full"><p className="text-text-secondary">Cargando movimientos...</p></div>}>
                  <TransactionList
                    transactions={transactions}
                    filters={filters}
                    loading={loading}
                    categoryIcons={categoryIcons}
                    onAdd={handleOpenForm}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onClearAll={handleClearAllData}
                    onExportExcel={handleExportExcel}
                    onExportClaude={handleExportClaude}
                    onMarkRecurring={handleMarkRecurring}
                    onUnmarkRecurring={handleUnmarkRecurring}
                  />
                </Suspense>
              </div>
            </div>
          )}

          {activeView === 'analysis' && (
            <div className="h-full flex flex-col animate-fade-in">
              <div className="mb-4">
                <TransactionFilters
                  filters={filters}
                  dateRange={dateRange}
                  expenseCategories={expenseCategories}
                  incomeCategories={incomeCategories}
                  onDateFilter={setDateFilter}
                  onCustomRange={setCustomRange}
                  onTypeFilter={setTypeFilter}
                  onCategoryFilter={setCategoryFilter}
                  onToggleQuickFilter={toggleQuickFilter}
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <Suspense fallback={<div className="flex items-center justify-center h-full"><p className="text-text-secondary">Cargando análisis...</p></div>}>
                  <ClaudeAnalysis
                    transactions={transactions}
                    summary={summary}
                    startDate={dateRange.start}
                    endDate={dateRange.end}
                    rule502030Mapping={effectiveRule502030Mapping}
                    onNavigateSettings={() => setActiveView('settings')}
                  />
                </Suspense>
              </div>
            </div>
          )}

          {activeView === 'categories' && (
            <div className="animate-fade-in">
              <Suspense fallback={<div className="flex items-center justify-center h-48"><p className="text-text-secondary">Cargando categorías...</p></div>}>
                <CategoriesView
                  transactions={transactions}
                  expenseCategories={expenseCategories}
                  incomeCategories={incomeCategories}
                  customExpenseCategories={expenseCategories.filter(c => !['Comida', 'Transporte', 'Bienestar', 'Servicios', 'Suscripciones', 'Otros'].includes(c))}
                  customIncomeCategories={incomeCategories.filter(c => !['Salario', 'Freelance', 'Otros'].includes(c))}
                  categoryIcons={categoryIcons}
                  onSetIcon={setCategoryIcon}
                  onAddExpense={addCustomExpenseCategory}
                  onAddIncome={addCustomIncomeCategory}
                  onRemoveExpense={removeCustomExpenseCategory}
                  onRemoveIncome={removeCustomIncomeCategory}
                  onRenameExpense={handleRenameExpenseCategory}
                  onRenameIncome={handleRenameIncomeCategory}
                />
              </Suspense>
            </div>
          )}

          {activeView === 'budgetRule' && (
            <div className="animate-fade-in">
              <Suspense fallback={<div className="flex items-center justify-center h-48"><p className="text-text-secondary">Cargando metas...</p></div>}>
                <BudgetRuleView
                  transactions={transactions}
                  totalIncome={summary?.total_income ?? 0}
                  expenseCategories={expenseCategories}
                  mapping={rule502030Mapping}
                  effectiveMapping={effectiveRule502030Mapping}
                  percentages={rule502030Percentages}
                  startDate={dateRange.start}
                  endDate={dateRange.end}
                  allTransactions={allTransactions}
                  savingsGoals={savingsGoals}
                  savingsGoalsLoading={savingsGoalsLoading}
                  rule502030Enabled={rule502030Enabled}
                  onToggleRule502030={toggleRule502030}
                  onCreateGoal={async goal => { await addGoal(goal); }}
                  onUpdateGoal={async goal => { await updateGoal(goal); }}
                  onRemoveGoal={async id => { await removeGoal(id); }}
                  onSave={updateRule502030Mapping}
                  onSavePercentages={updateRule502030Percentages}
                  onReset={async () => {
                    await updateRule502030Mapping(
                      ensureMappingCoversCategories(getDefaultRule502030Mapping(), expenseCategories)
                    );
                  }}
                />
              </Suspense>
            </div>
          )}

          {activeView === 'savings' && (
            <div className="animate-fade-in">
              <Suspense fallback={<div className="flex items-center justify-center h-48"><p className="text-text-secondary">Cargando ahorros...</p></div>}>
                <SavingsView
                  dollarRates={rates}
                  dollarLoading={dollarLoading}
                  rule502030Mapping={rule502030Mapping}
                />
              </Suspense>
            </div>
          )}

          {activeView === 'housing' && (
            <div className="animate-fade-in">
              <HousingErrorBoundary>
                <Suspense fallback={<div className="flex items-center justify-center h-full"><p className="text-text-secondary">Cargando vivienda...</p></div>}>
                  <HousingView
                    contract={housingContract}
                    loading={housingLoading}
                    hasRentalContract={hasRentalContract}
                    onSetHasRental={setHasRental}
                    onSave={saveHousingContract}
                    onDelete={removeHousingContract}
                  />
                </Suspense>
              </HousingErrorBoundary>
            </div>
          )}

          {activeView === 'database' && (
            <div className="animate-fade-in">
              <Suspense fallback={<div className="flex items-center justify-center h-full"><p className="text-text-secondary">Cargando base de datos...</p></div>}>
                <DatabaseViewer />
              </Suspense>
            </div>
          )}

          {activeView === 'settings' && (
            <div className="animate-fade-in">
              <Suspense fallback={<div className="flex items-center justify-center h-48"><p className="text-text-secondary">Cargando ajustes...</p></div>}>
                <Settings
                  onClearAllData={handleClearAllData}
                  selectedCurrency={selectedCurrency}
                  onCurrencyChange={setCurrency}
                />
              </Suspense>
            </div>
          )}
        </main>
      </div>

      {/* Transaction form modal */}
      {showForm && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-black/40" />}>
          <TransactionForm
            transaction={editingTx}
            initialType={formInitialType}
            recurringTemplate={recurringTemplate}
            recurringPayments={recurringPayments}
            expenseCategories={expenseCategories}
            incomeCategories={incomeCategories}
            categoryIcons={categoryIcons}
            housingContract={housingContract}
            dollarRates={rates}
            savingsGoals={savingsGoals}
            onAddCustomCategory={handleAddCustomCategory}
            onSave={handleSaveTransaction}
            onClose={handleCloseForm}
          />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <CurrencyProvider>
        <CategoriesProvider>
          <AppInner />
        </CategoriesProvider>
      </CurrencyProvider>
    </ToastProvider>
  );
}
