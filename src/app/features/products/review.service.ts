import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/config/api.config';
import { Review, ReviewInput } from './review.model';

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private http = inject(HttpClient);
  private readonly url = `${API_URL}/reviews`;

  // Newest first
  getReviews(productId: number): Observable<Review[]> {
    return this.http.get<Review[]>(
      `${this.url}?productId=${productId}&_sort=createdAt&_order=desc`
    );
  }

  // Every review of every watch, newest first (used by the admin Reviews page)
  getAllReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.url}?_sort=createdAt&_order=desc`);
  }

  // The server decides who wrote it (from the login token), whether it is a
  // verified purchase, and rejects a second review of the same watch.
  addReview(productId: number, input: ReviewInput): Observable<Review> {
    return this.http.post<Review>(this.url, { productId, ...input });
  }

  updateReview(id: number, input: ReviewInput): Observable<Review> {
    return this.http.patch<Review>(`${this.url}/${id}`, input);
  }

  deleteReview(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}