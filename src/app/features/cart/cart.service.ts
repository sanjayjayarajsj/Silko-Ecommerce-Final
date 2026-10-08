import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CartItem } from '../../store/cart/cart.state';
import { Observable, map, switchMap, forkJoin, of } from 'rxjs';
import { API_URL } from '../../core/config/api.config';

@Injectable({ providedIn: 'root' })
export class CartService {
  private http = inject(HttpClient);
  private readonly url = `${API_URL}/cart`;

  getCart(userId: number): Observable<CartItem[]> {
    return this.http.get<CartItem[]>(`${this.url}?userId=${userId}`);
  }

  addToCart(item: CartItem): Observable<CartItem> {
    return this.http.post<CartItem>(this.url, item);
  }

  updateCart(id: string | number, quantity: number): Observable<CartItem> {
    return this.http.patch<CartItem>(`${this.url}/${id}`, { quantity });
  }

  removeFromCart(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  findCartItem(productId: number, userId: number): Observable<CartItem[]> {
    return this.getCart(userId).pipe(
      map(items => items.filter(item => item.product.id === productId))
    );
  }

  clearCart(userId: number): Observable<void[]> {
    return this.getCart(userId).pipe(
      switchMap(items =>
        items.length === 0
          ? of([] as void[])
          : forkJoin(items.map(item => this.removeFromCart(item.id!)))
      )
    );
  }
}