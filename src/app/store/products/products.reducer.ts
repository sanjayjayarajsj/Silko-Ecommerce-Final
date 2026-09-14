import { createReducer, on } from '@ngrx/store';
import {loadProducts,loadProductsSuccess,loadProductsFailure} from './products.actions';
import { ProductsState, initialState } from './products.state';

export const productsReducer=createReducer(
  initialState,

  on(loadProducts, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  on(loadProductsSuccess, (state, { products }) => ({
    ...state,
    products: products,
    loading: false
  })),
  on(loadProductsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error: error
  }))
);