import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { productsReducer } from './store/products/products.reducer';
import { provideHttpClient } from '@angular/common/http';
import { provideEffects } from '@ngrx/effects';
import { ProductsEffects } from './store/products/products.effects';
import { cartReducer } from './store/cart/cart.reducer';
import { wishlistReducer } from './store/wishlist/wishlist.reducer';
import { CartEffects } from './store/cart/cart.effects';
import { WishlistEffects } from './store/wishlist/wishlist.effects';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes),provideHttpClient(), provideClientHydration(),
    provideStore({products:productsReducer,cart:cartReducer,wishlist:wishlistReducer}),
    provideEffects(ProductsEffects,CartEffects,WishlistEffects), provideAnimationsAsync()
  ]};
