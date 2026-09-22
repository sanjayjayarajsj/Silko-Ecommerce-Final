import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { switchMap, map, of } from 'rxjs';
import { AddressService } from '../../features/address/address.service';
import { AuthService } from '../../core/services/auth.service';
import {
  loadAddresses,
  loadAddressesSuccess,
  addAddress,
  addAddressSuccess,
  removeAddress,
  removeAddressSuccess
} from './address.actions';

@Injectable()
export class AddressEffects {
  private actions$ = inject(Actions);
  private addressService = inject(AddressService);
  private authService = inject(AuthService);

  loadAddresses$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadAddresses),
      switchMap(() => {
        const userId = this.authService.getUserId();

        if (!userId) {
          return of(loadAddressesSuccess({ addresses: [] }));
        }

        return this.addressService.getAddresses(userId).pipe(
          map(addresses => loadAddressesSuccess({ addresses }))
        );
      })
    )
  );

  addAddress$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addAddress),
      switchMap(({ address }) =>
        this.addressService.addAddress(address).pipe(
          map(savedAddress => addAddressSuccess({ address: savedAddress }))
        )
      )
    )
  );

  removeAddress$ = createEffect(() =>
    this.actions$.pipe(
      ofType(removeAddress),
      switchMap(({ id }) =>
        this.addressService.removeAddress(id).pipe(
          map(() => removeAddressSuccess({ id }))
        )
      )
    )
  );
}