import React, { createContext, useState, useCallback, useEffect } from 'react';
import { useCustomCategories } from '../hooks/useCustomCategories';
import { useCategoryIcons } from '../hooks/useCategoryIcons';

interface CategoriesContextValue {
  // Categories
  expenseCategories: string[];
  incomeCategories: string[];
  
  // Icons
  categoryIcons: Record<string, string>;
  setCategoryIcon: (category: string, icon: string) => Promise<void>;
  
  // Custom category operations
  addExpense: (name: string) => Promise<void>;
  addIncome: (name: string) => Promise<void>;
  removeExpense: (name: string) => Promise<void>;
  removeIncome: (name: string) => Promise<void>;
  renameExpense: (oldName: string, newName: string) => Promise<void>;
  renameIncome: (oldName: string, newName: string) => Promise<void>;
}

export const CategoriesContext = createContext<CategoriesContextValue | undefined>(undefined);

interface CategoriesProviderProps {
  children: React.ReactNode;
}

export const CategoriesProvider: React.FC<CategoriesProviderProps> = ({ children }) => {
  const {
    expenseCategories,
    incomeCategories,
    addExpense,
    addIncome,
    removeExpense,
    removeIncome,
    renameExpense,
    renameIncome,
  } = useCustomCategories();
  
  const { icons: categoryIcons, setIcon: setCategoryIcon } = useCategoryIcons();

  const value: CategoriesContextValue = {
    expenseCategories,
    incomeCategories,
    categoryIcons,
    setCategoryIcon,
    addExpense,
    addIncome,
    removeExpense,
    removeIncome,
    renameExpense,
    renameIncome,
  };

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
};
