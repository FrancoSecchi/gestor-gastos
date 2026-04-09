import React, { useState, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { Sidebar, ActiveView } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { SummaryCards } from './components/dashboard/SummaryCards';
import { ExpenseChart } from './components/dashboard/ExpenseChart';
import { Rule502030 } from './components/dashboard/Rule502030';
import { DollarRate } from './components/dashboard/DollarRate';
import { TransactionFilters } from './components/transactions/TransactionFilters';
import { TransactionList } from './components/transactions/TransactionList';
import { TransactionForm } from './components/transactions/TransactionForm';
import { ClaudeAnalysis } from './components/analysis/ClaudeAnalysis';
import { Settings } from './components/settings/Settings';
import { DatabaseViewer } from './components/database/DatabaseViewer';
import { CategoriesView } from './components/categories/CategoriesView';
import { Rule502030View } from './components/rule502030/Rule502030View';
import { HousingView } from './components/housing/HousingView';
import { AhorrosView } from './components/ahorros/AhorrosView';
import { ToastProvider, useToast } from './components/ui/Toast';
import { useTransactions } from './hooks/useTransactions';
import { useDollarRate } from './hooks/useDollarRate';
import { useFilters } from './hooks/useFilters';
import { Transaction, NewTransaction } from './types';
import { exportToExcel, exportForClaude } from './lib/export';
import { getReadableError, logError } from './lib/db';
import { calculateRule502030 } from './lib/rule502030';
import {
  getDefaultRule502030Mapping,
  ensureMappingCoversCategories,
} from './lib/rule502030Mapping';
import { useCustomCategories } from './hooks/useCustomCategories';
import { useRule502030Mapping } from './hooks/useRule502030Mapping';
import { useCategoryIcons } from './hooks/useCategoryIcons';
import { useHousingContract } from './hooks/useHousingContract';

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

function AppInner() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const { filters, dateRange, setDateFilter, setCustomRange, setTypeFilter, setCategoryFilter } = useFilters();
  const { transactions, summary, loading, addTransaction, editTransaction, removeTransaction, clearDatabase } = useTransactions(
    dateRange.start,
    dateRange.end
  );
  const { rates, loading: dollarLoading, error: dollarError, lastUpdate, refresh: refreshDollar } = useDollarRate();
  const {
    expenseCategories,
    incomeCategories,
    addExpense: addCustomExpenseCategory,
    addIncome: addCustomIncomeCategory,
    removeExpense: removeCustomExpenseCategory,
    removeIncome: removeCustomIncomeCategory,
    renameExpense: renameCustomExpenseCategory,
    renameIncome: renameCustomIncomeCategory,
    expenseCustom,
    incomeCustom,
    refresh: refreshCustomCategories,
  } = useCustomCategories();
  const { icons: categoryIcons, setIcon: setCategoryIcon } = useCategoryIcons();
  const { contract: housingContract, loading: housingLoading, save: saveHousingContract, remove: removeHousingContract } = useHousingContract();

  const {
    mapping: rule502030Mapping,
    updateMapping: updateRule502030Mapping,
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

  const handleSaveTransaction = useCallback(async (tx: NewTransaction | Transaction) => {
    const isEdit = 'id' in tx;
    try {
      if (isEdit) {
        await editTransaction(tx as Transaction);
        toast.success('Transacción actualizada', 'Los cambios fueron guardados correctamente.');
      } else {
        await addTransaction(tx as NewTransaction);
        toast.success('Transacción agregada', `Se registró ${tx.type === 'income' ? 'el ingreso' : 'el gasto'} exitosamente.`);
      }
    } catch (err) {
      await logError('App.handleSaveTransaction', err);
      toast.error('Error al guardar', getReadableError(err));
      throw err;
    }
  }, [addTransaction, editTransaction, toast]);

  const handleEdit = useCallback((tx: Transaction) => {
    setEditingTx(tx);
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingTx(null);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const confirmed = window.confirm('¿Seguro que querés eliminar esta transacción?');
    if (!confirmed) return;

    try {
      await removeTransaction(id);
      toast.success('Transacción eliminada', 'La transacción fue eliminada correctamente.');
    } catch (err) {
      await logError('App.handleDelete', err);
      toast.error('Error al eliminar', getReadableError(err));
    }
  }, [removeTransaction, toast]);

  const handleClearAllData = useCallback(async () => {
    try {
      await clearDatabase();
      await refreshCustomCategories();
      await refreshRule502030Mapping();
      toast.success('Base de datos limpiada', 'Se eliminó toda la información guardada.');
    } catch (err) {
      await logError('App.handleClearAllData', err);
      toast.error('Error al limpiar', getReadableError(err));
      throw err;
    }
  }, [clearDatabase, refreshCustomCategories, refreshRule502030Mapping, toast]);

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
      const rule = calculateRule502030(transactions, summary.total_income, effectiveRule502030Mapping);
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
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        transactionCount={transactions.length}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={VIEW_TITLES[activeView]}
          dollarRates={rates}
          dollarLoading={dollarLoading}
          dollarError={dollarError}
          lastUpdate={lastUpdate}
          onRefreshDollar={refreshDollar}
          summary={summary}
        />

        <main className="flex-1 overflow-y-auto p-5">
          {activeView === 'dashboard' && (
            <div className="flex flex-col gap-4 h-full animate-fade-in">
              {/* Filters */}
              <TransactionFilters
                filters={filters}
                dateRange={dateRange}
                expenseCategories={expenseCategories}
                incomeCategories={incomeCategories}
                onDateFilter={setDateFilter}
                onCustomRange={setCustomRange}
                onTypeFilter={setTypeFilter}
                onCategoryFilter={setCategoryFilter}
              />

              {/* Summary cards */}
              <SummaryCards summary={summary} loading={loading} />

              {/* Charts + Rule 502030 + Dollar */}
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
            </div>
          )}

          {activeView === 'transactions' && (
            <div className="flex flex-col gap-4 h-full animate-fade-in">
              <TransactionFilters
                filters={filters}
                dateRange={dateRange}
                expenseCategories={expenseCategories}
                incomeCategories={incomeCategories}
                onDateFilter={setDateFilter}
                onCustomRange={setCustomRange}
                onTypeFilter={setTypeFilter}
                onCategoryFilter={setCategoryFilter}
              />
              <div className="flex-1 overflow-hidden">
                <TransactionList
                  transactions={transactions}
                  filters={filters}
                  loading={loading}
                  categoryIcons={categoryIcons}
                  onAdd={() => setShowForm(true)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onClearAll={handleClearAllData}
                  onExportExcel={handleExportExcel}
                  onExportClaude={handleExportClaude}
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
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <ClaudeAnalysis
                  transactions={transactions}
                  summary={summary}
                  startDate={dateRange.start}
                  endDate={dateRange.end}
                  rule502030Mapping={effectiveRule502030Mapping}
                  onNavigateSettings={() => setActiveView('settings')}
                />
              </div>
            </div>
          )}

          {activeView === 'categories' && (
            <div className="animate-fade-in">
              <CategoriesView
                transactions={transactions}
                expenseCategories={expenseCategories}
                incomeCategories={incomeCategories}
                customExpenseCategories={expenseCustom}
                customIncomeCategories={incomeCustom}
                categoryIcons={categoryIcons}
                onSetIcon={setCategoryIcon}
                onAddExpense={addCustomExpenseCategory}
                onAddIncome={addCustomIncomeCategory}
                onRemoveExpense={removeCustomExpenseCategory}
                onRemoveIncome={removeCustomIncomeCategory}
                onRenameExpense={renameCustomExpenseCategory}
                onRenameIncome={renameCustomIncomeCategory}
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
                onSave={updateRule502030Mapping}
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
                <HousingView
                  contract={housingContract}
                  loading={housingLoading}
                  onSave={saveHousingContract}
                  onDelete={removeHousingContract}
                />
              </HousingErrorBoundary>
            </div>
          )}

          {activeView === 'database' && (
            <div className="animate-fade-in">
              <DatabaseViewer />
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
      <AppInner />
    </ToastProvider>
  );
}
