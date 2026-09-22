import { Injectable,inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Order, OrderStatus } from "./order.model";
import { Observable } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  private http = inject(HttpClient);

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
    return this.http.patch<Order>(
      `http://localhost:3000/orders/${id}`,
      { status }
    );
  }
}