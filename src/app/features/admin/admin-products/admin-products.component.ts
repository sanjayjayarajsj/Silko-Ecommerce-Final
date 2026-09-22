import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Product } from '../../products/product.model';
import { ProductService } from '../../products/product.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-products.component.html',
  styleUrl: './admin-products.component.css'
})
export class AdminProductsComponent {
  private productService = inject(ProductService);
  private toast = inject(ToastService);

  loading = true;

  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  pagedProducts: Product[] = [];
  categories: string[] = [];

  searchTerm = '';
  categoryFilter = 'All';
  stockFilter: 'All' | 'In Stock' | 'Low Stock' | 'Out of Stock' = 'All';

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  constructor() {
    this.loadProducts();
  }

  loadProducts() {
    this.loading = true;
    this.productService.getProducts().subscribe(products => {
      this.allProducts = products;
      this.categories = [...new Set(products.map(p => p.category))];
      this.applyFilters();
      this.loading = false;
    });
  }

  onFilterChange() {
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters() {
    let result = this.allProducts;

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term)
      );
    }

    if (this.categoryFilter !== 'All') {
      result = result.filter(p => p.category === this.categoryFilter);
    }

    if (this.stockFilter === 'In Stock') {
      result = result.filter(p => p.stock > 5);
    } else if (this.stockFilter === 'Low Stock') {
      result = result.filter(p => p.stock > 0 && p.stock <= 5);
    } else if (this.stockFilter === 'Out of Stock') {
      result = result.filter(p => p.stock === 0);
    }

    this.filteredProducts = result;
    this.totalPages = Math.max(1, Math.ceil(result.length / this.pageSize));

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    this.updatePagedProducts();
  }

  updatePagedProducts() {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedProducts = this.filteredProducts.slice(start, start + this.pageSize);
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.updatePagedProducts();
  }

  // Quick stock edit directly from the table, without opening the full edit form.
  updateStock(product: Product) {
    if (product.stock < 0) {
      product.stock = 0;
    }

    this.productService.updateProduct(product.id, { stock: product.stock }).subscribe(() => {
      this.toast.show(`Stock updated for ${product.name}`);
    });
  }

  deleteProduct(product: Product) {
    const confirmed = window.confirm(`Delete "${product.name}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    this.productService.deleteProduct(product.id).subscribe(() => {
      this.allProducts = this.allProducts.filter(p => p.id !== product.id);
      this.applyFilters();
      this.toast.show('Product deleted');
    });
  }
}