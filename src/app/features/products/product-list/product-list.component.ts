import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { loadProducts } from '../../../store/products/products.actions';
import { selectProducts } from '../../../store/products/products.selectors';
import { AsyncPipe } from '@angular/common';
import { ProductCardComponent } from '../../../shared/product-card/product-card.component';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute,Router } from '@angular/router';
@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [AsyncPipe,ProductCardComponent,FormsModule],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css'
})
export class ProductListComponent {
  searchText = '';
  selectedCategory = '';
  sortOption = '';
  currentPage = 1;
  pageSize = 8;
  skeletonCards = Array(8).fill(0);
  private store = inject(Store);
  private route=inject(ActivatedRoute);
  private router=inject(Router);
  products = this.store.select(selectProducts);

filterAndSortProducts(products: any[] | null) {
  if (!products) {
    return [];
  }

  const filtered = products.filter(product => {

    const matchesSearch =
      product.name
        .toLowerCase()
        .includes(this.searchText.toLowerCase());

    const matchesBrand =
      !this.selectedCategory ||
      product.brand === this.selectedCategory;

    return matchesSearch && matchesBrand;
  });

  if (this.sortOption === 'price-asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (this.sortOption === 'price-desc') {
    filtered.sort((a, b) => b.price - a.price);
  }

  return filtered;
}

pagedProducts(products: any[] | null) {
  const filtered = this.filterAndSortProducts(products);
  const start = (this.currentPage - 1) * this.pageSize;
  return filtered.slice(start, start + this.pageSize);
}

totalPages(products: any[] | null): number {
  const filtered = this.filterAndSortProducts(products);
  return Math.max(1, Math.ceil(filtered.length / this.pageSize));
}

goToPage(page: number, products: any[] | null) {
  const total = this.totalPages(products);
  if (page < 1 || page > total) {
    return;
  }
  this.currentPage = page;
}

resetPage() {
  this.currentPage = 1;
}

 constructor() {
  this.store.dispatch(loadProducts());

 this.route.queryParams.subscribe(params => {
  this.selectedCategory = params['brand'] || '';
  this.searchText = params['search'] || '';
  this.currentPage = 1;
});
}
clearSearch() {
  this.searchText = '';
  this.currentPage = 1;
  this.router.navigate(['/products']);
}
}