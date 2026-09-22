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
export const selectFeaturedProducts = createSelector(
  selectProducts,
  (products) => products.slice(0, 8)
);
