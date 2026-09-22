import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CartItem } from '../../store/cart/cart.state';
import { Observable, map, switchMap, forkJoin, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private http = inject(HttpClient);

getCart(userId: number): Observable<CartItem[]> {
  return this.http.get<CartItem[]>(
    `http://localhost:3000/cart?userId=${userId}`
  );
}
  addToCart(item: CartItem): Observable<CartItem> {
    return this.http.post<CartItem>(
      'http://localhost:3000/cart',
      item
    );
  }
updateCart(
  id: string | number,
  quantity: number
): Observable<CartItem> {
  return this.http.patch<CartItem>(
    `http://localhost:3000/cart/${id}`,
    {
      quantity: quantity
    }
  );
}
  removeFromCart(id: string): Observable<void> {
  return this.http.delete<void>(
    `http://localhost:3000/cart/${id}`
  );
}
findCartItem(
  productId: number,
  userId: number
): Observable<CartItem[]> {
  return this.getCart(userId).pipe(
    map(items =>
      items.filter(
        item => item.product.id === productId
      )
    )
  );
}
clearCart(userId: number): Observable<void[]> {
  return this.getCart(userId).pipe(
    switchMap(items => {
      if (items.length === 0) {
        return of([]);
      }
      return forkJoin(
        items.map(item => this.removeFromCart(item.id!))
      );
    })
  );
}
}