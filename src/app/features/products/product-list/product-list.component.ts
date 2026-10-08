import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ViewportScroller } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { loadProducts } from '../../../store/products/products.actions';
import { selectProducts, selectLoading, selectError } from '../../../store/products/products.selectors';
import { ProductCardComponent } from '../../../shared/product-card/product-card.component';
import { Product } from '../product.model';

const PAGE_SIZE = 12;
const SORT_OPTIONS = [
  { value: '', label: 'Featured' },
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name: A to Z' },
    { value: 'rating', label: 'Top rated' },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]['value'];

interface FilterChip {
  label: string;
  keys: string[]; // which URL parameters this chip clears
}

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [ProductCardComponent],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css'
})
export class ProductListComponent {
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private scroller = inject(ViewportScroller);

  readonly sortOptions = SORT_OPTIONS;
  readonly pageSize = PAGE_SIZE;
  readonly skeletonCards = Array(6).fill(0);

  // ---------- data from the store ----------
  private allProducts = this.store.selectSignal(selectProducts);
  readonly loading = this.store.selectSignal(selectLoading);
  readonly error = this.store.selectSignal(selectError);

  // ---------- the URL is the single source of truth for every filter ----------
  private params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap
  });

  readonly searchFromUrl = computed(() => this.params().get('search') ?? '');
  readonly search = computed(() => this.searchFromUrl().trim());
  readonly brand = computed(() => (this.params().get('brand') ?? '').trim());
  readonly category = computed(() => (this.params().get('category') ?? '').trim());
  readonly inStockOnly = computed(() => this.params().get('stock') === '1');
  readonly minPrice = computed(() => this.toPrice(this.params().get('min')));
  readonly maxPrice = computed(() => this.toPrice(this.params().get('max')));
  readonly sort = computed<SortKey>(() => {
    const value = this.params().get('sort') ?? '';
    return SORT_OPTIONS.some(option => option.value === value) ? (value as SortKey) : '';
  });
  private requestedPage = computed(() => {
    const page = Math.floor(Number(this.params().get('page')));
    return Number.isFinite(page) && page > 1 ? page : 1;
  });

  // What is typed in the search box. It is separate from the URL so that
  // typing a space (or pausing) never rewrites what the person is typing.
  readonly searchBox = signal('');
  readonly filtersOpen = signal(false);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  // ---------- options for the dropdowns ----------
  readonly brands = computed(() => this.countBy(this.allProducts(), product => product.brand));
  readonly categories = computed(() => this.countBy(this.allProducts(), product => product.category));

  // ---------- filtering, sorting, paging (all computed once per change) ----------
  readonly filtered = computed(() => {
    const words = this.search().toLowerCase().split(/\s+/).filter(Boolean);
    const brand = this.brand().toLowerCase();
    const category = this.category().toLowerCase();
    const min = this.minPrice();
    const max = this.maxPrice();
    const inStock = this.inStockOnly();

    const result = this.allProducts().filter(product => {
      const haystack = `${product.name} ${product.brand} ${product.category}`.toLowerCase();
      return (
        words.every(word => haystack.includes(word)) &&
        (!brand || product.brand.trim().toLowerCase() === brand) &&
        (!category || product.category.trim().toLowerCase() === category) &&
        (min === null || product.price >= min) &&
        (max === null || product.price <= max) &&
        (!inStock || product.stock > 0)
      );
    });

    return this.sortProducts(result, this.sort());
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE))
  );
  readonly currentPage = computed(() => Math.min(this.requestedPage(), this.totalPages()));
  readonly pagedProducts = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });
  readonly rangeStart = computed(() =>
    this.filtered().length === 0 ? 0 : (this.currentPage() - 1) * PAGE_SIZE + 1
  );
  readonly rangeEnd = computed(() =>
    Math.min(this.currentPage() * PAGE_SIZE, this.filtered().length)
  );

  // The first load: nothing to show yet.
  readonly showSkeleton = computed(() => this.loading() && this.allProducts().length === 0);
  readonly showError = computed(() => !!this.error() && this.allProducts().length === 0);

  // ---------- the little "active filter" tags above the grid ----------
  readonly chips = computed<FilterChip[]>(() => {
    const chips: FilterChip[] = [];
    if (this.search()) chips.push({ label: `Search: “${this.search()}”`, keys: ['search'] });
    if (this.brand()) chips.push({ label: `Brand: ${this.brand()}`, keys: ['brand'] });
    if (this.category()) chips.push({ label: `Style: ${this.category()}`, keys: ['category'] });
    if (this.inStockOnly()) chips.push({ label: 'In stock only', keys: ['stock'] });

    const min = this.minPrice();
    const max = this.maxPrice();
    if (min !== null && max !== null) {
      chips.push({ label: `${rupees.format(min)} – ${rupees.format(max)}`, keys: ['min', 'max'] });
    } else if (min !== null) {
      chips.push({ label: `Over ${rupees.format(min)}`, keys: ['min'] });
    } else if (max !== null) {
      chips.push({ label: `Under ${rupees.format(max)}`, keys: ['max'] });
    }
    return chips;
  });

  constructor() {
    // Refreshes the list every visit (the effect ignores a duplicate request
    // that is already in flight), so stock and prices are never stale.
    this.store.dispatch(loadProducts());

    // If the URL changes from outside the box (a tag was removed, a link was
    // clicked), show it in the box. Typing alone never triggers a rewrite.
    effect(() => {
      const fromUrl = this.search();
      untracked(() => {
        if (this.searchBox().trim() !== fromUrl) {
          this.searchBox.set(fromUrl);
        }
      });
    });

    inject(DestroyRef).onDestroy(() => clearTimeout(this.searchTimer));
  }

  // ---------- things the page can do ----------
  onSearchInput(value: string) {
    this.searchBox.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.update({ search: value.trim() || null }, { replace: true });
    }, 300);
  }

  clearSearch() {
    clearTimeout(this.searchTimer);
    this.update({ search: null });
  }

  setBrand(value: string) {
    this.update({ brand: value || null });
  }

  setCategory(value: string) {
    this.update({ category: value || null });
  }

  setSort(value: string) {
    this.update({ sort: value || null });
  }

  setInStock(checked: boolean) {
    this.update({ stock: checked ? '1' : null });
  }

  applyPrice(minText: string, maxText: string) {
    let min = this.toPrice(minText);
    let max = this.toPrice(maxText);
    if (min !== null && max !== null && min > max) {
      [min, max] = [max, min]; // typed the wrong way round: fix it for them
    }
    this.update({ min: min, max: max }, { replace: true });
  }

  removeChip(chip: FilterChip) {
    if (chip.keys.includes('search')) clearTimeout(this.searchTimer);
    this.update(Object.fromEntries(chip.keys.map(key => [key, null])));
  }

  clearFilters() {
    clearTimeout(this.searchTimer);
    this.update({ search: null, brand: null, category: null, stock: null, min: null, max: null });
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.update({ page: page === 1 ? null : page }, { keepPage: true });
    this.scroller.scrollToAnchor('products-top');
  }

  retry() {
    this.store.dispatch(loadProducts());
  }

  toggleFilters() {
    this.filtersOpen.update(open => !open);
  }

  // ---------- helpers ----------
  private update(
    params: Record<string, string | number | null>,
    options: { replace?: boolean; keepPage?: boolean } = {}
  ) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: options.keepPage ? params : { ...params, page: null },
      queryParamsHandling: 'merge',
      replaceUrl: !!options.replace
    });
  }

  private toPrice(value: string | null): number | null {
    if (value === null || value.trim() === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }

  private countBy(products: Product[], pick: (product: Product) => string) {
    const groups = new Map<string, { name: string; count: number }>();
    for (const product of products) {
      const name = pick(product).trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const group = groups.get(key);
      if (group) {
        group.count++;
      } else {
        groups.set(key, { name, count: 1 });
      }
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  }


  private sortProducts(products: Product[], sort: SortKey): Product[] {
    switch (sort) {
      case 'newest':
        return products.sort((a, b) => b.id - a.id);
              case 'rating':
        // best average first; more reviews wins a tie; unreviewed watches last
        return products.sort(
          (a, b) =>
            (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0) ||
            (b.ratingCount ?? 0) - (a.ratingCount ?? 0)
        );
      case 'price-asc':
        return products.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return products.sort((a, b) => b.price - a.price);
      case 'name':
        return products.sort((a, b) => a.name.localeCompare(b.name));
      default: {
        // Featured: grouped by brand (in the order brands first appear),
        // newest first inside each brand.
        const brandKey = (product: Product) => product.brand.trim().toLowerCase();
        const order: string[] = [];
        for (const product of this.allProducts()) {
          const key = brandKey(product);
          if (!order.includes(key)) order.push(key);
        }
        return products.sort((a, b) => {
          const diff = order.indexOf(brandKey(a)) - order.indexOf(brandKey(b));
          return diff !== 0 ? diff : b.id - a.id;
        });
      }
    }
  }
}