import { Injectable } from '@angular/core';
import { Product } from '../products/product.model';

export interface BuyNowItem {
  product: Product;
  quantity: number;
}
@Injectable({
  providedIn: 'root'
})
export class BuyNowService {
  private item: BuyNowItem | null = null;
  setItem(product: Product, quantity: number = 1) {
    this.item = { product, quantity };
  }
  takeItem(): BuyNowItem | null {
    const item = this.item;
    this.item = null;
    return item;
  }
}
