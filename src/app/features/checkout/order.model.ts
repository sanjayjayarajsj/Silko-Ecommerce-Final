import { Product } from "../products/product.model";

export interface Order {
  id?: number;
  userId: number;
  fullName: string;
  address: string;
  city: string;
  pincode: string;
  items: {
    product: Product;
    quantity: number;
  }[];
  total: number;
}