export interface Review {
  id: number;
  productId: number;
  userId: number;
  userName: string;
  rating: number; // 1 to 5
  title?: string;
  comment: string;
  createdAt: string;
  updatedAt?: string;
  // true when the writer has a delivered order that contains this watch
  verifiedPurchase: boolean;
}

export interface ReviewInput {
  rating: number;
  title: string;
  comment: string;
}