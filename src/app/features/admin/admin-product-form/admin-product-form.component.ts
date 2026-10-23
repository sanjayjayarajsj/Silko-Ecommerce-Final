import { Component, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../products/product.service';
import { ToastService } from '../../../core/services/toast.service';
import { validateImageFile, fileToResizedDataUrl, } from '../../../shared/image-file';
import { ImageCropperComponent, ImageTransform } from 'ngx-image-cropper';
import { Product,ProductSpecs,SPEC_FIELDS } from '../../products/product.model';
@Component({
  selector: 'app-admin-product-form',
  standalone: true,
  imports: [FormsModule,ImageCropperComponent],
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
    // Specifications table shown on the product page (all optional)
  readonly specFields = SPEC_FIELDS;
  specs: ProductSpecs = {};
  uploadingImage = false;
  uploadingImage2 = false;
    // Used for duplicate checking and brand/category suggestions
  existingProducts: Product[] = [];
  brandOptions: string[] = [];
  categoryOptions: string[] = [];
    // ---------- image crop popup ----------
  cropperOpen = false;
  cropSlot: 1 | 2 = 1;
  cropFile?: File;
  cropUrl?: string;
  cropBase64?: string;
  cropReady = false;
  cropMaintain = true;
  cropAspect = 1;
  cropRotation = 0;
  cropScale = 1;
  cropTransform: ImageTransform = {};

  readonly aspectOptions = [
    { label: 'Free', value: 0 },
    { label: '1:1', value: 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '3:4', value: 3 / 4 }
  ];

  @ViewChild(ImageCropperComponent) private cropper?: ImageCropperComponent;

  constructor() {
        this.productService.getAllProducts().subscribe(products => {
      this.existingProducts = products;
      this.brandOptions = this.uniqueSorted(products.map(p => p.brand));
      this.categoryOptions = this.uniqueSorted(products.map(p => p.category));
    });
    const idParam = this.route.snapshot.paramMap.get('id');

    if (idParam) {
      this.productId = Number(idParam);
      this.isEditMode = true;
      this.loading = true;

      this.productService.getAllProducts().subscribe(products => {
        const product = products.find(p => p.id === this.productId);
        if (!product) {
          this.toast.show('Product not found.');
          this.router.navigate(['/admin/products']);
          return;
        }

        this.name = product.name;
        this.brand = product.brand;
        this.category = product.category;
        this.price = product.price;
        this.stock = product.stock;
        this.description = product.description;
        this.image = product.image;
        this.image2 = product.images?.[1] ?? '';
        this.specs = { ...(product.specs ?? {}) };
        this.loading = false;
      });
    }
  }

  // ---------- image upload + crop popup ----------

  // slot 1 = main image, slot 2 = second (gallery) image.
  // Picking a file now opens the crop popup instead of saving straight away.
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

    this.openCropper(slot, { file });
    input.value = '';
  }

  // "Crop / Edit" button under an existing preview image
  editImage(slot: 1 | 2): void {
    const src = (slot === 1 ? this.image : this.image2).trim();
    if (!src) {
      return;
    }

    if (src.startsWith('data:')) {
      this.openCropper(slot, { base64: src });
    } else {
      this.openCropper(slot, { url: src });
    }
  }

  private openCropper(
    slot: 1 | 2,
    source: { file?: File; url?: string; base64?: string }
  ): void {
    this.cropSlot = slot;
    this.cropFile = source.file;
    this.cropUrl = source.url;
    this.cropBase64 = source.base64;
    this.resetCrop();
    this.cropReady = false;
    this.cropperOpen = true;
  }

  setAspect(value: number): void {
    this.cropMaintain = value !== 0;
    this.cropAspect = value || 1;
  }

  rotate(direction: 1 | -1): void {
    this.cropRotation = (this.cropRotation + direction + 4) % 4;
  }

  flip(): void {
    this.cropTransform = { ...this.cropTransform, flipH: !this.cropTransform.flipH };
  }

  setZoom(value: number | string): void {
    this.cropScale = Number(value);
    this.cropTransform = { ...this.cropTransform, scale: this.cropScale };
  }

  resetCrop(): void {
    this.cropMaintain = true;
    this.cropAspect = 1;
    this.cropRotation = 0;
    this.cropScale = 1;
    this.cropTransform = {};
  }

  applyCrop(): void {
    const result = this.cropper?.crop('base64');
    const data = result?.base64;

    if (!data) {
      this.toast.show('Could not crop that image. Please try again.');
      return;
    }

    if (this.cropSlot === 1) {
      this.image = data;
    } else {
      this.image2 = data;
    }

    this.closeCropper();
  }

  closeCropper(): void {
    this.cropperOpen = false;
    this.cropFile = undefined;
    this.cropUrl = undefined;
    this.cropBase64 = undefined;
  }

  onCropLoadFailed(): void {
    this.toast.show("This image can't be opened for editing. Please upload the file instead.");
    this.closeCropper();
  }

  // ---------- helpers ----------

  private uniqueSorted(values: string[]): string[] {
    const seen = new Map<string, string>();
    for (const v of values) {
      const t = (v || '').trim();
      if (t && !seen.has(t.toLowerCase())) {
        seen.set(t.toLowerCase(), t);
      }
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }

  // lower-case + collapse spaces so "Titan  NEO" equals "titan neo"
  private normalize(value: string): string {
    return (value || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  // If the typed value matches an existing option (ignoring case), use the
  // existing spelling. Otherwise keep what was typed.
  private matchExisting(value: string, options: string[]): string {
    const typed = value.trim().replace(/\s+/g, ' ');
    return options.find(o => o.toLowerCase() === typed.toLowerCase()) ?? typed;
  }

  get isDuplicateName(): boolean {
    const n = this.normalize(this.name);
    if (!n) {
      return false;
    }
    return this.existingProducts.some(
      p => Number(p.id) !== this.productId && this.normalize(p.name) === n
    );
  }

  // Stops - + e . , from being typed in the price / stock boxes
  blockInvalidNumberKey(event: KeyboardEvent): void {
    if (['-', '+', 'e', 'E', '.', ','].includes(event.key)) {
      event.preventDefault();
    }
  }

  get isPriceInvalid(): boolean {
    return this.price === null || !Number.isInteger(this.price) || this.price <= 0;
  }

  get isStockInvalid(): boolean {
    return this.stock === null || !Number.isInteger(this.stock) || this.stock < 0;
  }

  // ---------- validation + save ----------

  isFormValid(): boolean {
    return (
      !!this.name.trim() &&
      !this.isDuplicateName &&
      !!this.brand.trim() &&
      !!this.category.trim() &&
      !!this.description.trim() &&
      !!this.image.trim() &&
      !this.isPriceInvalid &&
      !this.isStockInvalid
    );
  }

  save() {
    this.submitted = true;

    if (!this.isFormValid()) {
      return;
    }

    this.saving = true;

    // Re-check against the latest products, in case someone added the
    // same product after this page was opened.
    this.productService.getAllProducts().subscribe({
      next: products => {
        this.existingProducts = products;

        if (this.isDuplicateName) {
          this.saving = false;
          this.toast.show('A product with this name already exists');
          return;
        }

        this.saveProduct();
      },
      error: () => {
        this.saving = false;
        this.toast.show('Something went wrong. Please try again.');
      }
    });
  }

  private saveProduct() {
    const images = this.image2.trim()
      ? [this.image.trim(), this.image2.trim()]
      : [this.image.trim()];
    // keep only the specification boxes that were filled in
    const specs: ProductSpecs = {};
    for (const field of SPEC_FIELDS) {
      const value = (this.specs[field.key] ?? '').trim();
      if (value) {
        specs[field.key] = value;
      }
    }
    const productData = {
      name: this.name.trim().replace(/\s+/g, ' '),
      brand: this.matchExisting(this.brand, this.brandOptions),
      category: this.matchExisting(this.category, this.categoryOptions),
      price: this.price!,
      stock: this.stock!,
      description: this.description.trim(),
      image: this.image.trim(),
      images: images,
      specs: specs
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