import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ProductsState } from './products.state';

export const selectProductsState =
  createFeatureSelector<ProductsState>('products');
export const selectProducts = createSelector(
  selectProductsState,
  (state) => state.products
);
export const selectLoading = createSelector(
  selectProductsState,
  (state) => state.loading
);
export const selectError = createSelector(
  selectProductsState,
  (state) => state.error
);
// Shuffles a copy of the array (Fisher-Yates) so the featured section
// shows a different mix of products each time it loads.
function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const selectFeaturedProducts = createSelector(
  selectProducts,
  (products) => shuffle(products).slice(0, 8)
);