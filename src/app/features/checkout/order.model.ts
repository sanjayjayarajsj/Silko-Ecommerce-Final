import { Product } from "../products/product.model";

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface Order {
  id?: number;
  userId: number;
  fullName: string;
  address: string;
  city: string;
  pincode: string;
  // Delivery contact number (older orders have none)
  phone?: string;
  paymentMethod: 'Card' | 'UPI' | 'COD';
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
  total: number;

  // Money to give back: cancelled items plus returns that were refunded.
  // (Missing = nothing refunded.)
  refundedTotal?: number;

  // Filled in when the order is cancelled (shown to the customer)
  cancelNote?: string;
  cancelledAt?: string;
  cancelledBy?: 'admin' | 'user';

  // Set when the admin marks the order Delivered (starts the return window)
  deliveredAt?: string;

  // OLD orders only: a return asked for the WHOLE order. New returns are
  // made per item (see OrderItem.returnRequest).
  returnRequest?: ReturnRequest;
}

// One line of an order. Each item can be cancelled, or returned, on its own.
export interface OrderItem {
  product: Product;
  quantity: number;

  // Set when this item is cancelled (before the order ships)
  cancelled?: ItemCancel;

  // Set when the customer asks to return this item (after delivery)
  returnRequest?: ReturnRequest;
}

export interface ItemCancel {
  at: string;
  by: 'admin' | 'user';
  note: string;
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


// ---------- Per-item helpers (used by My Orders and the admin pages) ----------

// Items that are still part of the order
export function activeItems(order: Order): OrderItem[] {
  return order.items.filter(item => !item.cancelled);
}

// What the customer really pays for: the total minus anything refunded
export function orderNetTotal(order: Order): number {
  return Math.max(0, order.total - (order.refundedTotal ?? 0));
}

// Customers can cancel only until the order ships
export function canCustomerCancel(order: Order): boolean {
  return order.status === 'Pending' || order.status === 'Processing';
}

export function canCancelItem(order: Order, item: OrderItem): boolean {
  return canCustomerCancel(order) && !item.cancelled;
}

// A delivered item can be returned once, inside the return window
export function canReturnItem(order: Order, item: OrderItem): boolean {
  if (item.cancelled || item.returnRequest || order.returnRequest) {
    return false;
  }
  const deadline = returnDeadline(order);
  return !!deadline && Date.now() <= deadline.getTime();
}

export interface ItemState {
  label: string;
  cssClass: string;   // re-uses the order status colours
}

// The small label shown beside each item: Cancelled / Return Approved / Delivered ...
export function itemState(order: Order, item: OrderItem): ItemState {
  if (item.cancelled) {
    return { label: 'Cancelled', cssClass: 'status-cancelled' };
  }

  const request = item.returnRequest ?? order.returnRequest;
  if (request) {
    return { label: `Return ${request.status.toLowerCase()}`, cssClass: returnStatusClass(request.status) };
  }

  const labels: Record<string, string> = {
    Pending: 'Order placed',
    Processing: 'Preparing',
    Shipped: 'Shipped',
    Delivered: 'Delivered'
  };
  return {
    label: labels[order.status] ?? order.status,
    cssClass: 'status-' + order.status.toLowerCase()
  };
}

// Short text for the admin orders list: "Return: Requested", "Returns: 2" ...
export function orderReturnSummary(order: Order): string | null {
  if (order.returnRequest) {
    return `Return: ${order.returnRequest.status}`;
  }

  const requests = order.items.map(item => item.returnRequest).filter(request => !!request);
  if (requests.length === 0) {
    return null;
  }
  if (requests.length === 1) {
    return `Return: ${requests[0]!.status}`;
  }

  const waiting = requests.filter(request => request!.status === 'Requested').length;
  return waiting > 0
    ? `Returns: ${requests.length} (${waiting} new)`
    : `Returns: ${requests.length}`;
}