import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { WishlistItem } from '../../store/wishlist/wishlist.state';
import { API_URL } from '../../core/config/api.config';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private http = inject(HttpClient);
  private readonly url = `${API_URL}/wishlist`;

  getWishlist(userId: number): Observable<WishlistItem[]> {
    return this.http.get<WishlistItem[]>(`${this.url}?userId=${userId}`);
  }

  findWishlistItem(productId: number, userId: number): Observable<WishlistItem[]> {
    return this.getWishlist(userId).pipe(
      map(items => items.filter(item => item.product.id === productId))
    );
  }

  addToWishlist(item: WishlistItem): Observable<WishlistItem> {
    return this.http.post<WishlistItem>(this.url, item);
  }

  removeFromWishlist(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}