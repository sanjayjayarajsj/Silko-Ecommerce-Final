import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable,map } from 'rxjs';
import { WishlistItem } from '../../store/wishlist/wishlist.state';
@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private http = inject(HttpClient);
getWishlist(userId: number): Observable<WishlistItem[]> {
  return this.http.get<WishlistItem[]>(
    `http://localhost:3000/wishlist?userId=${userId}`
  );
}
findWishlistItem(
  productId: number,
  userId: number
): Observable<WishlistItem[]> {
  return this.getWishlist(userId).pipe(
    map(items =>
      items.filter(
        item => item.product.id === productId
      )
    )
  );
}
addToWishlist(item: WishlistItem): Observable<WishlistItem> {
  return this.http.post<WishlistItem>(
    'http://localhost:3000/wishlist',
    item
  );
}
removeFromWishlist(id: number): Observable<void> {
  return this.http.delete<void>(
    `http://localhost:3000/wishlist/${id}`
  );
}
}