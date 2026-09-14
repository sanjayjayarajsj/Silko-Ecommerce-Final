import { Product } from "../../features/products/product.model";

export interface WishlistItem {
  id?: string | number;
  userId: number;
  product: Product;
}

export interface WishlistState {
  items: WishlistItem[];
}

export const initialWishlistState: WishlistState = {
  items: []
};;
