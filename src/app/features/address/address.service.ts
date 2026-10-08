import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Address } from './address.model';
import { API_URL } from '../../core/config/api.config';

@Injectable({ providedIn: 'root' })
export class AddressService {
  private http = inject(HttpClient);
  private readonly url = `${API_URL}/addresses`;

  getAddresses(userId: number): Observable<Address[]> {
    return this.http.get<Address[]>(`${this.url}?userId=${userId}`);
  }

  addAddress(address: Address): Observable<Address> {
    return this.http.post<Address>(this.url, address);
  }

  removeAddress(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}