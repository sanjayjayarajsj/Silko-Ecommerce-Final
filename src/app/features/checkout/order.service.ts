import { Injectable,inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Order, OrderStatus, ReturnRequest } from "./order.model";
import { Observable, tap } from "rxjs";
import { ProductService } from "../products/product.service";

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  private http = inject(HttpClient);
  private productService = inject(ProductService);

  placeOrder(order: Order): Observable<Order> {
    return this.http.post<Order>(
      'http://localhost:3000/orders',
      order
    );
  }
  getOrders(userId: number): Observable<Order[]> {
  return this.http.get<Order[]>(
    `http://localhost:3000/orders?userId=${userId}`
  );
}

  // Used by the admin panel - unlike getOrders(), this is not scoped to one user.
  getAllOrders(): Observable<Order[]> {
    return this.http.get<Order[]>('http://localhost:3000/orders');
  }

  getOrder(id: number): Observable<Order> {
    return this.http.get<Order>(`http://localhost:3000/orders/${id}`);
  }

  updateOrderStatus(id: number, status: OrderStatus): Observable<Order> {
    const changes: Partial<Order> = { status };

    // remember when it was delivered - the 7-day return window starts here
    if (status === 'Delivered') {
      changes.deliveredAt = new Date().toISOString();
    }

    return this.http.patch<Order>(
      `http://localhost:3000/orders/${id}`,
      changes
    );
  }

  // Cancels an order: saves the status + the admin's note, then gives the
  // stock back. It uses each product's CURRENT stock (not the old copy that
  // is stored inside the order), so the stock count stays correct.
  cancelOrder(
    order: Order,
    note: string,
    cancelledBy: 'admin' | 'user' = 'admin'
  ): Observable<Order> {
    return this.http.patch<Order>(
      `http://localhost:3000/orders/${order.id}`,
      {
        status: 'Cancelled',
        cancelNote: note,
        cancelledBy,
        cancelledAt: new Date().toISOString()
      }
    ).pipe(
      tap(() => {
        order.items.forEach(item => {
          this.productService.getProduct(item.product.id).subscribe({
            next: product => {
              this.productService
                .updateProduct(product.id, { stock: product.stock + item.quantity })
                .subscribe();
            },
            error: () => {} // product was deleted - nothing to restore
          });
        });
      })
    );
  }

  // Customer asks to return a delivered order
  requestReturn(order: Order, reason: string, comment: string): Observable<Order> {
    const returnRequest: ReturnRequest = {
      reason,
      comment: comment.trim() || undefined,
      requestedAt: new Date().toISOString(),
      status: 'Requested'
    };

    return this.http.patch<Order>(
      `http://localhost:3000/orders/${order.id}`,
      { returnRequest }
    );
  }

  // Admin moves the return forward (or rejects it with a note)
  updateReturn(order: Order, changes: Partial<ReturnRequest>): Observable<Order> {
    const returnRequest: ReturnRequest = {
      ...order.returnRequest!,
      ...changes,
      updatedAt: new Date().toISOString()
    };

    return this.http.patch<Order>(
      `http://localhost:3000/orders/${order.id}`,
      { returnRequest }
    );
  }
}