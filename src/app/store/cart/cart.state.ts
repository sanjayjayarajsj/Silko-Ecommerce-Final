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