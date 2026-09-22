export interface Product {
  id: number;
  name: string;
  brand: string;
  price: number;
  image: string;
  images?: string[];
  category: string;
  description: string;
  stock: number;
}