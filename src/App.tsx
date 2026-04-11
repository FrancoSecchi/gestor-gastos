import React, { useState, useCallback, useEffect, Component, ErrorInfo, ReactNode, lazy, Suspense } from 'react';
import { Sidebar, ActiveView } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { SummaryCards } from './components/dashboard/SummaryCards';
import { ExpenseChart } from './components/dashboard/ExpenseChart';
import { Rule502030 } from './components/dashboard/Rule502030';
import { DollarRate } from './components/dashboard/DollarRate';
import { RecurringPaymentsWidget } from './components/dashboard/RecurringPaymentsWidget';
import { TransactionFilters } from './components/transactions/TransactionFilters';
import { TransactionList } from './components/transactions/TransactionList';
import { TransactionForm } from './components/transactions/TransactionForm';
import { Settings } from './components/settings/Settings';
import { CategoriesView } from './components/categories/CategoriesView';
import { Rule502030View } from './components/rule502030/Rule502030View';
import { AhorrosView } from './components/ahorros/AhorrosView';
import { ToastProvider, useToast } from './components/ui/Toast';

// Lazy load heavy components
const ClaudeAnalysis = lazy(() => import('./components/analysis/ClaudeAnalysis').then(m => ({ default: m.ClaudeAnalysis })));
const DatabaseViewer = lazy(() => import('./components/database/DatabaseViewer').then(m => ({ default: m.DatabaseViewer })));
const HousingView = lazy(() => import('./components/housing/HousingView').then(m => ({ default: m.HousingView })));
import { CategoriesProvider } from './contexts/CategoriesContext';
import { useCategoriesContext } from './hooks/useCategoriesContext';
import { useTransactions } from './hooks/useTransactions';
import { useRecurringPayments } from './hooks/useRecurringPayments';
import { deleteReceiptFile } from './lib/receiptUtils';
import { useDollarRate } from './hooks/useDollarRate';
import { useFilters } from './hooks/useFilters';
import { Transaction, NewTransaction, RecurringPayment, RecurrenceFrequency, RECURRENCE_LABELS } from './types';
import { exportToExcel, exportForClaude } from './lib/export';
import { getReadableError, logError, getTransactions, createRecurringPayment } from './lib/db';
import { calculateRule502030 } from './lib/rule502030';
import {
  getDefaultRule502030Mapping,
  ensureMappingCoversCategories,
} from './lib/rule502030Mapping';
import { useRule502030Mapping } from './hooks/useRule502030Mapping';
import { useHousingContract } from './hooks/useHousingContract';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ChevronDown } from 'lucide-react';

const VIEW_TITLES: Record<ActiveView, string> = {
  dashboard: 'Dashboard',
  transactions: 'Transacciones',
  analysis: 'Análisis con IA',
  categories: 'Categorías',
  rule502030: 'Regla 50/30/20',
  vivienda: 'Vivienda',
  ahorros: 'Ahorros',
  settings: 'Configuración',
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

  const { filters, dateRange, setDateFilter, setCustomRange, setTypeFilter, setCategoryFilter, toggleQuickFilter } = useFilters();
  const { transactions, summary, loading, addTransaction, editTransaction, removeTransaction, clearDatabase, refresh: refreshTransactions } = useTransactions(
    dateRange.start,
    dateRange.end
  );
  const { rates, loading: dollarLoading, error: dollarError, lastUpdate, refresh: refreshDollar } = useDollarRate();
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
  const { contract: housingContract, loading: housingLoading, save: saveHousingContract, remove: removeHousingContract } = useHousingContract();
  const { recurringPayments, refresh: refreshRecurring, toggleRecurring, removeRecurring } = useRecurringPayments();

  const refreshCurrentMonthTransactions = useCallback(async () => {
    const now = new Date();
    const start = format(startOfMonth(now), 'yyyy-MM-dd');
    const end = format(endOfMonth(now), 'yyyy-MM-dd');
    const txs = await getTransactions(start, end);
    setCurrentMonthTransactions(txs);
  }, []);

  useEffect(() => {
    refreshCurrentMonthTransactions();
  }, [refreshCurrentMonthTransactions]);

  const {
    mapping: rule502030Mapping,
    percentages: rule502030Percentages,
    updateMapping: updateRule502030Mapping,
    updatePercentages: updateRule502030Percentages,
    refresh: refreshRule502030Mapping,
  } = useRule502030Mapping(expenseCategories);
  const toast = useToast();

  const effectiveRule502030Mapping = rule502030Mapping ?? getDefaultRule502030Mapping();

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
  }, [addTransaction, editTransaction, toast, refreshRecurring, refreshCurrentMonthTransactions, refreshTransactions, dateRange.start, dateRange.end]);

  const handleUnmarkRecurring = useCallback(async (tx: Transaction) => {
    try {
      await editTransaction({ ...tx, recurring_id: null });
      await refreshTransactions(dateRange.start, dateRange.end);
      toast.success('Recurrente eliminado', 'La transacción ya no está vinculada a ningún pago recurrente.');
    } catch (err) {
      await logError('App.handleUnmarkRecurring', err);
      toast.error('Error', getReadableError(err));
    }
  }, [editTransaction, refreshTransactions, dateRange.start, dateRange.end, toast]);

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
      await Promise.all([refreshRecurring(), refreshTransactions(dateRange.start, dateRange.end), refreshCurrentMonthTransactions()]);
      toast.success('Pago recurrente creado', `Marcado como ${RECURRENCE_LABELS[frequency].toLowerCase()}.`);
    } catch (err) {
      await logError('App.handleMarkRecurring', err);
      toast.error('Error', getReadableError(err));
    }
  }, [editTransaction, refreshRecurring, refreshTransactions, refreshCurrentMonthTransactions, dateRange.start, dateRange.end, toast]);

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
      toast.success('Transacción eliminada', 'La transacción fue eliminada correctamente.');
    } catch (err) {
      await logError('App.handleDelete', err);
      toast.error('Error al eliminar', getReadableError(err));
    }
  }, [removeTransaction, transactions, toast]);

  const handleClearAllData = useCallback(async () => {
    try {
      await clearDatabase();
      await refreshRule502030Mapping();
      toast.success('Base de datos limpiada', 'Se eliminó toda la información guardada.');
    } catch (err) {
      await logError('App.handleClearAllData', err);
      toast.error('Error al limpiar', getReadableError(err));
      throw err;
    }
  }, [clearDatabase, refreshRule502030Mapping, toast]);

  const handleExportExcel = useCallback(async () => {
    if (!summary) return;
    try {
      exportToExcel(transactions, summary, dateRange.start, dateRange.end);
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
                />

              {/* Summary Cards - Collapsible */}
              
              <SummaryCards summary={summary} loading={loading} onOpenForm={handleOpenFormWithType} />
              
                            {/* Recurring Payments Widget - Collapsible */}
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


              {/* Charts + Rule 502030 + Dollar - Collapsible */}
              <CollapsibleCard
                title="Gráficos y Análisis"
                isOpen={expandedCards.charts}
                onToggle={() => toggleCard('charts')}
              >
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <ExpenseChart
                      transactions={transactions}
                      byCategory={summary?.by_category ?? []}
                    />
                  </div>
                  <div className="flex flex-col gap-4">
                    <Rule502030
                      transactions={transactions}
                      totalIncome={summary?.total_income ?? 0}
                      mapping={effectiveRule502030Mapping}
                      percentages={rule502030Percentages}
                      startDate={dateRange.start}
                      endDate={dateRange.end}
                    />
                    <DollarRate
                      rates={rates}
                      loading={dollarLoading}
                      error={dollarError}
                      lastUpdate={lastUpdate}
                      onRefresh={refreshDollar}
                    />
                  </div>
                </div>
              </CollapsibleCard>


              
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
            </div>
          )}

          {activeView === 'rule502030' && (
            <div className="animate-fade-in">
              <Rule502030View
                transactions={transactions}
                totalIncome={summary?.total_income ?? 0}
                expenseCategories={expenseCategories}
                mapping={rule502030Mapping}
                effectiveMapping={effectiveRule502030Mapping}
                percentages={rule502030Percentages}
                startDate={dateRange.start}
                endDate={dateRange.end}
                onSave={updateRule502030Mapping}
                onSavePercentages={updateRule502030Percentages}
                onReset={async () => {
                  await updateRule502030Mapping(
                    ensureMappingCoversCategories(getDefaultRule502030Mapping(), expenseCategories)
                  );
                }}
              />
            </div>
          )}

          {activeView === 'ahorros' && (
            <div className="animate-fade-in">
              <AhorrosView
                dollarRates={rates}
                dollarLoading={dollarLoading}
                rule502030Mapping={rule502030Mapping}
              />
            </div>
          )}

          {activeView === 'vivienda' && (
            <div className="animate-fade-in">
              <HousingErrorBoundary>
                <Suspense fallback={<div className="flex items-center justify-center h-full"><p className="text-text-secondary">Cargando vivienda...</p></div>}>
                  <HousingView
                    contract={housingContract}
                    loading={housingLoading}
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
              <Settings onClearAllData={handleClearAllData} />
            </div>
          )}
        </main>
      </div>

      {/* Transaction form modal */}
      {showForm && (
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
          onAddCustomCategory={handleAddCustomCategory}
          onSave={handleSaveTransaction}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <CategoriesProvider>
        <AppInner />
      </CategoriesProvider>
    </ToastProvider>
  );
}
