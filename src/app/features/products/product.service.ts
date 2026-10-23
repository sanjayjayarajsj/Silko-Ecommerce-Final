import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Product } from './product.model';
import { API_URL } from '../../core/config/api.config';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private readonly url = `${API_URL}/products`;

  private fetchAll(): Observable<Product[]> {
    return this.http.get<Product[]>(this.url);
  }

  // Active products only (shop, dashboard, admin list).
  getProducts(): Observable<Product[]> {
    return this.fetchAll().pipe(map(list => list.filter(p => !p.isDeleted)));
  }

  // Active + deleted (used for the duplicate-name check in the admin form).
  getAllProducts(): Observable<Product[]> {
    return this.fetchAll();
  }

  // Deleted products only, newest deletion first.
  getDeletedProducts(): Observable<Product[]> {
    return this.fetchAll().pipe(
      map(list =>
        list
          .filter(p => p.isDeleted)
          .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''))
      )
    );
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.url}/${id}`);
  }

  addProduct(product: Omit<Product, 'id'>): Observable<Product> {
    return this.http.post<Product>(this.url, product);
  }

  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.http.patch<Product>(`${this.url}/${id}`, product);
  }

  // Soft delete: just flags the product.
  softDeleteProduct(id: number): Observable<Product> {
    return this.http.patch<Product>(`${this.url}/${id}`, {
      isDeleted: true,
      deletedAt: new Date().toISOString()
    });
  }

  restoreProduct(id: number): Observable<Product> {
    return this.http.patch<Product>(`${this.url}/${id}`, {
      isDeleted: false,
      deletedAt: null
    });
  }

  // Permanent delete (only used from the Deleted Products page now).
  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}