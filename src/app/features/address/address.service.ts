import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Address } from './address.model';

@Injectable({
  providedIn: 'root'
})
export class AddressService {

  private http = inject(HttpClient);

  getAddresses(userId: number): Observable<Address[]> {
    return this.http.get<Address[]>(
      `http://localhost:3000/addresses?userId=${userId}`
    );
  }

  addAddress(address: Address): Observable<Address> {
    return this.http.post<Address>(
      'http://localhost:3000/addresses',
      address
    );
  }

  removeAddress(id: string | number): Observable<void> {
    return this.http.delete<void>(
      `http://localhost:3000/addresses/${id}`
    );
  }
}