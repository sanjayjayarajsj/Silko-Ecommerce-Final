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
}
