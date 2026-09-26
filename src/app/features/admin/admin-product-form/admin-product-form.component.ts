import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../products/product.service';
import { ToastService } from '../../../core/services/toast.service';
import { validateImageFile, fileToResizedDataUrl } from '../../../shared/image-file';

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
  uploadingImage = false;
  uploadingImage2 = false;

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

  // slot 1 = main image, slot 2 = second (gallery) image. Shared by both
  // file inputs so uploading works the same way for either.
  onImageFileSelected(event: Event, slot: 1 | 2): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const error = validateImageFile(file);
    if (error) {
      this.toast.show(error.message);
      input.value = '';
      return;
    }

    if (slot === 1) {
      this.uploadingImage = true;
    } else {
      this.uploadingImage2 = true;
    }

    fileToResizedDataUrl(file, 900)
      .then(dataUrl => {
        if (slot === 1) {
          this.image = dataUrl;
        } else {
          this.image2 = dataUrl;
        }
      })
      .catch(() => {
        this.toast.show('Could not process that image. Please try another one.');
      })
      .finally(() => {
        if (slot === 1) {
          this.uploadingImage = false;
        } else {
          this.uploadingImage2 = false;
        }
        input.value = '';
      });
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