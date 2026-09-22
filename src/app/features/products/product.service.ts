import { Injectable,inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Product } from './product.model';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class ProductService {
private http=inject(HttpClient);
getProducts(): Observable<Product[]> {
  return this.http.get<Product[]>(
    'http://localhost:3000/products'
  );
}

// Everything below is used by the admin panel.

getProduct(id: number): Observable<Product> {
  return this.http.get<Product>(
    `http://localhost:3000/products/${id}`
  );
}

addProduct(product: Omit<Product, 'id'>): Observable<Product> {
  return this.http.post<Product>(
    'http://localhost:3000/products',
    product
  );
}

updateProduct(id: number, product: Partial<Product>): Observable<Product> {
  return this.http.patch<Product>(
    `http://localhost:3000/products/${id}`,
    product
  );
}

deleteProduct(id: number): Observable<void> {
  return this.http.delete<void>(
    `http://localhost:3000/products/${id}`
  );
}
}