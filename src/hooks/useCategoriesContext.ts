import { useContext } from 'react';
import { CategoriesContext } from '../contexts/CategoriesContext';

export function useCategoriesContext() {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error('useCategoriesContext debe usarse dentro de CategoriesProvider');
  }
  return context;
}
