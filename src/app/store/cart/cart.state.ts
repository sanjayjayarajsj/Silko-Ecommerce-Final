import { Product } from "../../features/products/product.model";

export interface CartItem {
    id?:string;
    userId:number;
  product: Product;
  quantity: number;
}
export interface CartState {
  items: CartItem[];
}
export const initialCartState: CartState = {
  items: []
};
export const MAX_QUANTITY_PER_PRODUCT = 5;

// How many *different* products the cart can hold at once (quantity per
// product is capped separately, by MAX_QUANTITY_PER_PRODUCT above).
export const MAX_PRODUCTS_IN_CART = 5;