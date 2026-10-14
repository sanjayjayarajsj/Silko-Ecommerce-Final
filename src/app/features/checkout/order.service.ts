import { Injectable,inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Order, OrderStatus, ReturnRequest } from "./order.model";
import { Observable } from "rxjs";
import { API_URL } from "../../core/config/api.config";

// What the browser sends when someone places an order. It says WHICH watches,
// HOW MANY and WHERE to send them - never a price, a status or a stock number:
// the server looks those up itself, so they cannot be tampered with.
export interface PlaceOrderRequest {
  items: { productId: number; quantity: number }[];
  // 'cart': the order empties those cart lines. 'buy-now': the cart is left alone.
  source: 'cart' | 'buy-now';
  // The total the customer was shown. If the real total is different (a price
  // changed in the meantime) the server refuses and says so.
  expectedTotal: number;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  paymentMethod: 'Card' | 'UPI' | 'COD';
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  private http = inject(HttpClient);
  private readonly url = `${API_URL}/orders`;

  // The server checks everything, takes the stock off, works out the total and
  // creates the order. The order it sends back is the real one.
  placeOrder(request: PlaceOrderRequest): Observable<Order> {
    return this.http.post<Order>(this.url, request);
  }

  getOrders(userId: number): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.url}?userId=${userId}`);
  }

  // Used by the admin panel - unlike getOrders(), this is not scoped to one user.
  getAllOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.url);
  }

  getOrder(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.url}/${id}`);
  }

  // Admin: move an order one step forward. The server sets the delivery time
  // itself (it starts the 7-day return window).
  updateOrderStatus(id: number, status: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(`${this.url}/${id}`, { status });
  }

  // Cancels an order. The SERVER saves the status and the note, and gives the
  // stock back to each watch's current stock. Who cancelled (customer or admin)
  // is decided by the server from the login, so the third argument is only
  // kept so the pages that call this do not need to change.
  cancelOrder(
    order: Order,
    note: string,
    _cancelledBy: 'admin' | 'user' = 'admin'
  ): Observable<Order> {
    return this.http.post<Order>(`${this.url}/${order.id}/cancel`, { note });
  }

  // Cancel ONE item of an order (before it ships). The server gives that item's
  // stock back and adds its price to the refund; when no item is left, the whole
  // order becomes Cancelled. Customers and admins both use this.
  cancelItem(order: Order, productId: number, note: string): Observable<Order> {
    return this.http.post<Order>(`${this.url}/${order.id}/items/${productId}/cancel`, { note });
  }

  // Customer asks to return ONE delivered item
  returnItem(order: Order, productId: number, reason: string, comment: string): Observable<Order> {
    return this.http.post<Order>(
      `${this.url}/${order.id}/items/${productId}/return`,
      { reason, comment }
    );
  }

  // Admin moves ONE item's return forward (or rejects it with a note)
  updateItemReturn(
    order: Order,
    productId: number,
    changes: { status: ReturnRequest['status']; adminNote?: string }
  ): Observable<Order> {
    return this.http.patch<Order>(`${this.url}/${order.id}/items/${productId}/return`, changes);
  }

  // OLD: asks to return a whole order. Kept so orders made before per-item
  // returns can still be handled.
  // Customer asks to return a delivered order
  requestReturn(order: Order, reason: string, comment: string): Observable<Order> {
    const returnRequest: ReturnRequest = {
      reason,
      comment: comment.trim() || undefined,
      requestedAt: new Date().toISOString(),
      status: 'Requested'
    };

    return this.http.patch<Order>(`${this.url}/${order.id}`, { returnRequest });
  }

  // Admin moves the return forward (or rejects it with a note)
  updateReturn(order: Order, changes: Partial<ReturnRequest>): Observable<Order> {
    const returnRequest: ReturnRequest = {
      ...order.returnRequest!,
      ...changes,
      updatedAt: new Date().toISOString()
    };

    return this.http.patch<Order>(`${this.url}/${order.id}`, { returnRequest });
  }
}