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
};

// How many products the wishlist can hold at once.
export const MAX_PRODUCTS_IN_WISHLIST = 5;