import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../products/product.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-product-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-product-form.component.html',
  styleUrl: './admin-product-form.component.css'
})
export class AdminProductFormComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private toast = inject(ToastService);

  productId: number | null = null;
  isEditMode = false;
  loading = false;
  saving = false;
  submitted = false;

  name = '';
  brand = '';
  category = '';
  price: number | null = null;
  stock: number | null = null;
  description = '';
  image = '';
  image2 = '';

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      this.productId = Number(idParam);
      this.isEditMode = true;
      this.loading = true;

      this.productService.getProduct(this.productId).subscribe(product => {
        this.name = product.name;
        this.brand = product.brand;
        this.category = product.category;
        this.price = product.price;
        this.stock = product.stock;
        this.description = product.description;
        this.image = product.image;
        this.image2 = product.images?.[1] ?? '';
        this.loading = false;
      });
    }
  }

  isFormValid(): boolean {
    return (
      !!this.name.trim() &&
      !!this.brand.trim() &&
      !!this.category.trim() &&
      !!this.description.trim() &&
      !!this.image.trim() &&
      this.price !== null && this.price > 0 &&
      this.stock !== null && this.stock >= 0
    );
  }

  save() {
    this.submitted = true;

    if (!this.isFormValid()) {
      return;
    }

    this.saving = true;

    const images = this.image2.trim()
      ? [this.image.trim(), this.image2.trim()]
      : [this.image.trim()];

    const productData = {
      name: this.name.trim(),
      brand: this.brand.trim(),
      category: this.category.trim(),
      price: this.price!,
      stock: this.stock!,
      description: this.description.trim(),
      image: this.image.trim(),
      images: images
    };

    const request = this.isEditMode && this.productId
      ? this.productService.updateProduct(this.productId, productData)
      : this.productService.addProduct(productData);

    request.subscribe({
      next: () => {
        this.toast.show(this.isEditMode ? 'Product updated' : 'Product added');
        this.router.navigate(['/admin/products']);
      },
      error: () => {
        this.saving = false;
        this.toast.show('Something went wrong. Please try again.');
      }
    });
  }

  cancel() {
    this.router.navigate(['/admin/products']);
  }
}