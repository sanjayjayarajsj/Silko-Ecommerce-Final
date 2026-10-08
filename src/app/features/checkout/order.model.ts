import { Product } from "../products/product.model";

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface Order {
  id?: number;
  userId: number;
  fullName: string;
  address: string;
  city: string;
  pincode: string;
    phone?: string;
  paymentMethod: 'Card' | 'UPI' | 'COD';
  status: OrderStatus;
  createdAt: string;
  items: {
    product: Product;
    quantity: number;
  }[];
  total: number;

  // Filled in when the order is cancelled (shown to the customer)
  cancelNote?: string;
  cancelledAt?: string;
  cancelledBy?: 'admin' | 'user';

  // Set when the admin marks the order Delivered (starts the return window)
  deliveredAt?: string;

  // Set when the customer asks to return a Delivered order
  returnRequest?: ReturnRequest;
}

export type ReturnStatus = 'Requested' | 'Approved' | 'Picked Up' | 'Refunded' | 'Rejected';

export interface ReturnRequest {
  reason: string;
  comment?: string;
  requestedAt: string;
  status: ReturnStatus;
  adminNote?: string;   // shown to the customer when the return is rejected
  updatedAt?: string;
}

// ---------- Order status flow (used by the admin pages) ----------
// Pending -> Processing -> Shipped -> Delivered. An order can only move ONE
// step forward; earlier steps (and skipping a step) are disabled.
export const ORDER_FLOW: OrderStatus[] = ['Pending', 'Processing', 'Shipped', 'Delivered'];

// true = this <option> must be greyed out in the status dropdown
export function isStatusOptionDisabled(current: OrderStatus, option: OrderStatus): boolean {
  // "Cancelled" is never picked from the dropdown - the Cancel button is
  // used instead, because a cancel note is required.
  if (option === 'Cancelled') {
    return true;
  }

  const currentIndex = ORDER_FLOW.indexOf(current);
  const optionIndex = ORDER_FLOW.indexOf(option);

  if (currentIndex === -1) {
    return true; // order is Cancelled - everything is locked
  }

  return optionIndex !== currentIndex && optionIndex !== currentIndex + 1;
}

// Delivered and Cancelled orders can't be changed any more
export function isStatusLocked(status: OrderStatus): boolean {
  return status === 'Delivered' || status === 'Cancelled';
}

export function canCancelOrder(status: OrderStatus): boolean {
  return status === 'Pending' || status === 'Processing' || status === 'Shipped';
}

// ---------- Returns ----------
export const RETURN_WINDOW_DAYS = 7;

// Requested -> Approved -> Picked Up -> Refunded  (or Rejected, with a note)
export const RETURN_FLOW: ReturnStatus[] = ['Requested', 'Approved', 'Picked Up', 'Refunded'];

// Last day the customer can still ask for a return (null = order not delivered)
export function returnDeadline(order: Order): Date | null {
  if (order.status !== 'Delivered') {
    return null;
  }
  // older orders have no deliveredAt, so fall back to the order date
  const start = new Date(order.deliveredAt ?? order.createdAt);
  return new Date(start.getTime() + RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

export function canRequestReturn(order: Order): boolean {
  if (order.returnRequest) {
    return false;
  }
  const deadline = returnDeadline(order);
  return !!deadline && Date.now() <= deadline.getTime();
}

// Same rule as the order dropdown: stay, or move exactly one step forward
export function isReturnOptionDisabled(current: ReturnStatus, option: ReturnStatus): boolean {
  if (option === 'Rejected') {
    return true; // done with the Reject button, because a note is required
  }

  const currentIndex = RETURN_FLOW.indexOf(current);
  const optionIndex = RETURN_FLOW.indexOf(option);

  if (currentIndex === -1) {
    return true; // already Rejected
  }

  return optionIndex !== currentIndex && optionIndex !== currentIndex + 1;
}

export function isReturnLocked(status: ReturnStatus): boolean {
  return status === 'Refunded' || status === 'Rejected';
}

// A return can only be rejected before it is approved
export function canRejectReturn(status: ReturnStatus): boolean {
  return status === 'Requested';
}

// Re-uses the order status colours (status-pending, status-shipped ...)
export function returnStatusClass(status: ReturnStatus): string {
  const classes: Record<ReturnStatus, string> = {
    'Requested': 'status-pending',
    'Approved': 'status-processing',
    'Picked Up': 'status-shipped',
    'Refunded': 'status-delivered',
    'Rejected': 'status-cancelled'
  };
  return classes[status];
}