import { Product } from "../products/product.model";

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface Order {
  id?: number;
  userId: number;
  fullName: string;
  address: string;
  city: string;
  pincode: string;
  paymentMethod: 'Card' | 'UPI' | 'COD';
  status: OrderStatus;
  createdAt: string;
  items: {
    product: Product;
    quantity: number;
  }[];
  total: number;
}