import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of } from 'rxjs';
import { ProductService } from '../../features/products/product.service';
import {loadProducts,loadProductsSuccess,loadProductsFailure} from './products.actions';

@Injectable()
export class ProductsEffects {
  private actions$ = inject(Actions);
  private productService = inject(ProductService);
  loadProducts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadProducts),
      exhaustMap(() =>
        this.productService.getProducts().pipe(
          map(products =>
            loadProductsSuccess({ products })
          ),
          catchError(() =>
            of(
              loadProductsFailure({
                error: 'Failed to load products'
              })))
        ))));
}