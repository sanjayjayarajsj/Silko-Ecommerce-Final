import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe, ViewportScroller } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { SPEC_FIELDS } from '../product.model';
import { Review } from '../review.model';
import { ReviewService } from '../review.service';
import { loadProducts } from '../../../store/products/products.actions';
import { selectProducts, selectLoading, selectError } from '../../../store/products/products.selectors';
import { addToCart } from '../../../store/cart/cart.actions';
import { selectCartItems } from '../../../store/cart/cart.selectors';
import { MAX_PRODUCTS_IN_CART } from '../../../store/cart/cart.state';
import { addToWishlist, removeFromWishlist } from '../../../store/wishlist/wishlist.actions';
import { selectWishlistItems } from '../../../store/wishlist/wishlist.selectors';
import { MAX_PRODUCTS_IN_WISHLIST } from '../../../store/wishlist/wishlist.state';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { BuyNowService } from '../../checkout/buy-now.service';
import { handleImageError } from '../../../shared/image-fallback';
import { ProductCardComponent } from '../../../shared/product-card/product-card.component';
import { ConfirmationDialogComponent } from '../../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [ProductCardComponent, RouterLink, CurrencyPipe, DatePipe, ConfirmationDialogComponent],
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.css'
})
export class ProductDetailsComponent {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(Store);
  private buyNowService = inject(BuyNowService);
  private toast = inject(ToastService);
  private title = inject(Title);
  private meta = inject(Meta);
  private reviewService = inject(ReviewService);
  private scroller = inject(ViewportScroller);

  handleImageError = handleImageError;
  readonly ratingStars = [1, 2, 3, 4, 5];

  // ---------- which product? (read from the URL, so clicking a similar
  // watch just changes :id and everything below updates) ----------
  private params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  private productId = computed(() => {
    const id = Number(this.params().get('id'));
    return Number.isInteger(id) && id > 0 ? id : null;
  });

  // ---------- data from the store ----------
  private allProducts = this.store.selectSignal(selectProducts);
  private loading = this.store.selectSignal(selectLoading);
  private error = this.store.selectSignal(selectError);
  private cartItems = this.store.selectSignal(selectCartItems);
  private wishlistItems = this.store.selectSignal(selectWishlistItems);

  readonly product = computed(() => {
    const id = this.productId();
    return id === null ? undefined : this.allProducts().find(product => product.id === id);
  });

  // The three situations when there is no product to show yet
  readonly notFound = computed(
    () => !this.product() && (this.productId() === null || (!this.loading() && !this.error()))
  );
  readonly showError = computed(() => !this.product() && !!this.error() && this.productId() !== null);
  readonly showSkeleton = computed(() => !this.product() && !this.notFound() && !this.showError());

  readonly similarProducts = computed(() => {
    const current = this.product();
    if (!current) return [];
    return this.allProducts()
      .filter(product => product.category === current.category && product.id !== current.id)
      .slice(0, 4);
  });

  readonly inCart = computed(() => {
    const current = this.product();
    return !!current && this.cartItems().some(item => item.product.id === current.id);
  });

  readonly inWishlist = computed(() => {
    const current = this.product();
    return !!current && this.wishlistItems().some(item => item.product.id === current.id);
  });

  // Rows of the Specifications table: brand and style always, then every
  // specification the admin has filled in.
  readonly specRows = computed(() => {
    const current = this.product();
    if (!current) return [];
    const rows = [
      { label: 'Brand', value: current.brand },
      { label: 'Style', value: current.category }
    ];
    for (const field of SPEC_FIELDS) {
      const value = current.specs?.[field.key]?.trim();
      if (value) rows.push({ label: field.label, value });
    }
    return rows;
  });

  // Real rating, kept up to date by the server from the customer reviews.
  readonly rating = computed(() => this.product()?.ratingAverage ?? 0);
  readonly reviewCount = computed(() => this.product()?.ratingCount ?? 0);

  // ---------- customer reviews ----------
  readonly reviews = signal<Review[]>([]);
  readonly reviewsLoaded = signal(false);
  readonly reviewsFailed = signal(false);
  readonly visibleReviews = signal(5);

  readonly currentUserId = this.authService.getUserId();
  readonly loggedIn = this.authService.isLoggedIn();

  readonly myReview = computed(() =>
    this.currentUserId === null ? undefined : this.reviews().find(review => review.userId === this.currentUserId)
  );
  readonly shownReviews = computed(() => this.reviews().slice(0, this.visibleReviews()));

  // Summary built from the list itself, so it always matches the reviews shown
  readonly summaryAverage = computed(() => {
    const list = this.reviews();
    return list.length ? list.reduce((sum, review) => sum + review.rating, 0) / list.length : 0;
  });
  readonly distribution = computed(() => {
    const list = this.reviews();
    return [5, 4, 3, 2, 1].map(stars => {
      const count = list.filter(review => review.rating === stars).length;
      return { stars, count, percent: list.length ? Math.round((count / list.length) * 100) : 0 };
    });
  });

  // the write / edit form
  readonly draftRating = signal(0);
  readonly draftTitle = signal('');
  readonly draftComment = signal('');
  readonly editing = signal(false);
  readonly submitting = signal(false);
  readonly formError = signal('');
  readonly pendingDelete = signal<Review | null>(null);
  readonly showForm = computed(() => this.reviewsLoaded() && this.loggedIn && (!this.myReview() || this.editing()));

  // ---------- image gallery + hover zoom ----------
  private pickedImage = signal<string | null>(null);
  readonly mainImage = computed(() => this.pickedImage() ?? this.product()?.image ?? '');
  readonly gallery = computed(() => {
    const images = this.product()?.images ?? [];
    return images.length > 1 ? images : [];
  });
  readonly zoomOrigin = signal('center');
  readonly isZooming = signal(false);

  constructor() {
    // Refresh the product list on every visit, so price and stock are current.
    this.store.dispatch(loadProducts());

    // A different product: start from its main image again.
    effect(() => {
      this.productId();
      untracked(() => {
        this.pickedImage.set(null);
        this.isZooming.set(false);
      });
    });

    // A different product: load its reviews and clear any half-written review.
    effect(() => {
      const id = this.productId();
      untracked(() => {
        this.draftRating.set(0);
        this.draftTitle.set('');
        this.draftComment.set('');
        this.editing.set(false);
        this.formError.set('');
        this.visibleReviews.set(5);
        if (id !== null) this.loadReviews(id);
      });
    });

    // Each product gets its own browser-tab title and search-engine description.
    effect(() => {
      const current = this.product();
      if (current) {
        this.title.setTitle(`${current.name} | SILKO`);
        const text = (current.description ?? '').trim();
        this.meta.updateTag({
          name: 'description',
          content: text.length > 155 ? `${text.slice(0, 152)}...` : text
        });
      } else if (this.notFound()) {
        this.title.setTitle('Watch not found | SILKO');
      }
    });
  }

  selectImage(image: string) {
    this.pickedImage.set(image);
  }

  onImageHover(event: MouseEvent) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    this.zoomOrigin.set(`${x}% ${y}%`);
    this.isZooming.set(true);
  }

  resetZoom() {
    this.isZooming.set(false);
  }

  retry() {
    this.store.dispatch(loadProducts());
  }

  // ---------- buttons ----------
  private requireLogin(): number | null {
    const userId = this.authService.getUserId();
    if (!userId) {
      this.toast.show('Please login to continue');
      this.router.navigate(['/login']);
      return null;
    }
    return userId;
  }

  addToCart() {
    const current = this.product();
    if (!current) return;

    // Already in the cart: the button becomes "Go to Cart"
    if (this.inCart()) {
      this.router.navigate(['/cart']);
      return;
    }

    const userId = this.requireLogin();
    if (userId === null) return;

    this.store.select(selectCartItems).pipe(take(1)).subscribe(items => {
      if (items.length >= MAX_PRODUCTS_IN_CART) {
        this.toast.show(`Your cart is full. You can add up to ${MAX_PRODUCTS_IN_CART} different products.`);
        return;
      }
      this.store.dispatch(addToCart({ product: current, userId }));
      this.toast.show('Added to cart');
    });
  }

  toggleWishlist() {
    const current = this.product();
    if (!current) return;

    const userId = this.requireLogin();
    if (userId === null) return;

    if (this.inWishlist()) {
      this.store.dispatch(removeFromWishlist({ productId: current.id }));
      this.toast.show('Removed from Wishlist');
      return;
    }

    this.store.select(selectWishlistItems).pipe(take(1)).subscribe(items => {
      if (items.length >= MAX_PRODUCTS_IN_WISHLIST) {
        this.toast.show(`Your wishlist is full. You can add up to ${MAX_PRODUCTS_IN_WISHLIST} products.`);
        return;
      }
      this.store.dispatch(addToWishlist({ product: current, userId }));
      this.toast.show('Added to Wishlist');
    });
  }

  buyNow() {
    const current = this.product();
    if (!current) return;

    const userId = this.requireLogin();
    if (userId === null) return;

    this.buyNowService.setItem(current, 1);
    this.router.navigate(['/checkout']);
  }

  // ---------- reviews ----------
  private loadReviews(productId: number) {
    this.reviewsLoaded.set(false);
    this.reviewsFailed.set(false);
    this.reviewService.getReviews(productId).subscribe({
      next: reviews => {
        if (this.productId() !== productId) return; // the person already moved on
        this.reviews.set(reviews);
        this.reviewsLoaded.set(true);
      },
      error: () => {
        if (this.productId() !== productId) return;
        this.reviews.set([]);
        this.reviewsFailed.set(true);
        this.reviewsLoaded.set(true);
      }
    });
  }

  starsOf(rating: number): boolean[] {
    return this.ratingStars.map(star => star <= Math.round(rating));
  }

  scrollToReviews() {
    this.scroller.scrollToAnchor('reviews');
  }

  setDraftRating(value: number) {
    this.draftRating.set(value);
    this.formError.set('');
  }

  startEdit() {
    const mine = this.myReview();
    if (!mine) return;
    this.draftRating.set(mine.rating);
    this.draftTitle.set(mine.title ?? '');
    this.draftComment.set(mine.comment);
    this.formError.set('');
    this.editing.set(true);
  }

  cancelEdit() {
    this.editing.set(false);
    this.formError.set('');
  }

  submitReview() {
    const current = this.product();
    if (!current || this.submitting()) return;

    if (this.draftRating() < 1) {
      this.formError.set('Please choose a star rating.');
      return;
    }
    if (this.draftComment().trim().length < 5) {
      this.formError.set('Please write a few words about the watch (at least 5 characters).');
      return;
    }

    const input = {
      rating: this.draftRating(),
      title: this.draftTitle().trim(),
      comment: this.draftComment().trim()
    };
    const mine = this.myReview();
    const request = this.editing() && mine
      ? this.reviewService.updateReview(mine.id, input)
      : this.reviewService.addReview(current.id, input);

    this.submitting.set(true);
    this.formError.set('');

    request.subscribe({
      next: () => {
        const wasEditing = this.editing();
        this.submitting.set(false);
        this.editing.set(false);
        this.draftRating.set(0);
        this.draftTitle.set('');
        this.draftComment.set('');
        this.toast.show(wasEditing ? 'Review updated' : 'Thank you for your review');
        this.afterReviewChange(current.id);
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.formError.set(error.error?.message ?? 'Could not save your review. Please try again.');
        if (error.status === 409) this.loadReviews(current.id); // already reviewed: show it
      }
    });
  }

  askDelete(review: Review) {
    this.pendingDelete.set(review);
  }

  confirmDelete() {
    const review = this.pendingDelete();
    const current = this.product();
    this.pendingDelete.set(null);
    if (!review || !current) return;

    this.reviewService.deleteReview(review.id).subscribe({
      next: () => {
        this.toast.show('Review deleted');
        this.afterReviewChange(current.id);
      },
      error: () => this.toast.show('Could not delete the review. Please try again.')
    });
  }

  // Reload the list, and the product list so the average and count are fresh
  private afterReviewChange(productId: number) {
    this.loadReviews(productId);
    this.store.dispatch(loadProducts());
  }

  showMoreReviews() {
    this.visibleReviews.update(count => count + 5);
  }
}