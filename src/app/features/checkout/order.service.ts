import { Injectable,inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Order } from "./order.model";
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
}