import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Product } from '../../products/product.model';
import { ProductService } from '../../products/product.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmationDialogComponent } from '../../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-admin-deleted-products',
  standalone: true,
  imports: [DatePipe, ConfirmationDialogComponent],
  templateUrl: './admin-deleted-products.component.html',
  // reuse the products page styles instead of copying them
  styleUrls: ['../admin-products/admin-products.component.css'],
  styles: [`.actions-cell button.restore { color: var(--color-accent); }`]
})
export class AdminDeletedProductsComponent {
  private productService = inject(ProductService);
  private toast = inject(ToastService);

  loading = true;
  deletedProducts: Product[] = [];
  productToRemove: Product | null = null;

  constructor() {
    this.productService.getDeletedProducts().subscribe(products => {
      this.deletedProducts = products;
      this.loading = false;
    });
  }

  restore(product: Product): void {
    this.productService.restoreProduct(product.id).subscribe(() => {
      this.deletedProducts = this.deletedProducts.filter(p => p.id !== product.id);
      this.toast.show(`${product.name} restored`);
    });
  }

  askPermanentDelete(product: Product): void {
    this.productToRemove = product;
  }

  cancelPermanentDelete(): void {
    this.productToRemove = null;
  }

  permanentDelete(): void {
    const product = this.productToRemove;
    if (!product) {
      return;
    }

    this.productService.deleteProduct(product.id).subscribe(() => {
      this.deletedProducts = this.deletedProducts.filter(p => p.id !== product.id);
      this.toast.show('Product permanently deleted');
      this.productToRemove = null;
    });
  }
}