export interface Address {
  id?: string | number;
  userId: number;
  type: 'Home' | 'Work';
  fullName: string;
  address: string;
  city: string;
  pincode: string;
}