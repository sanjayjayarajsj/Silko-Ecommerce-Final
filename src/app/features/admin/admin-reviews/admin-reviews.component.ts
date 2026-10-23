import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Review } from '../../products/review.model';
import { ReviewService } from '../../products/review.service';
import { ProductService } from '../../products/product.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmationDialogComponent } from '../../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [FormsModule, DatePipe, ConfirmationDialogComponent],
  templateUrl: './admin-reviews.component.html',
  styleUrl: './admin-reviews.component.css'
})
export class AdminReviewsComponent {
  private reviewService = inject(ReviewService);
  private productService = inject(ProductService);
  private toast = inject(ToastService);

  loading = true;
  failed = false;

  allReviews: Review[] = [];
  filteredReviews: Review[] = [];
  pagedReviews: Review[] = [];

  // product id -> product name, so each review can show which watch it is for
  private productNames = new Map<number, string>();

  searchTerm = '';
  ratingFilter = 'All'; // 'All' or '1' .. '5'
  readonly stars = [1, 2, 3, 4, 5];

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  pendingDelete: Review | null = null;

  constructor() {
    this.load();
  }

  load() {
    this.loading = true;
    this.failed = false;

    forkJoin({
      reviews: this.reviewService.getAllReviews(),
      products: this.productService.getAllProducts()
    }).subscribe({
      next: ({ reviews, products }) => {
        this.productNames = new Map(products.map(product => [product.id, product.name]));
        this.allReviews = reviews;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.failed = true;
        this.loading = false;
      }
    });
  }

  productName(review: Review): string {
    return this.productNames.get(review.productId) ?? `Watch #${review.productId}`;
  }

  onFilterChange() {
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters() {
    let result = this.allReviews;

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter(review =>
        `${review.userName} ${review.title ?? ''} ${review.comment} ${this.productName(review)}`
          .toLowerCase()
          .includes(term)
      );
    }

    if (this.ratingFilter !== 'All') {
      result = result.filter(review => review.rating === Number(this.ratingFilter));
    }

    this.filteredReviews = result;
    this.totalPages = Math.max(1, Math.ceil(result.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    this.updatePaged();
  }

  updatePaged() {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedReviews = this.filteredReviews.slice(start, start + this.pageSize);
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.updatePaged();
  }

  askDelete(review: Review) {
    this.pendingDelete = review;
  }

  confirmDelete() {
    const review = this.pendingDelete;
    this.pendingDelete = null;
    if (!review) return;

    this.reviewService.deleteReview(review.id).subscribe({
      next: () => {
        this.allReviews = this.allReviews.filter(item => item.id !== review.id);
        this.applyFilters();
        this.toast.show('Review deleted');
      },
      error: () => {
        this.toast.show('Could not delete this review. Please try again.');
      }
    });
  }
}