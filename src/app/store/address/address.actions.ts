import { createAction, props } from "@ngrx/store";
import { Address } from "../../features/address/address.model";

export const loadAddresses = createAction('[Address] Load Addresses');
export const loadAddressesSuccess = createAction(
  '[Address] Load Addresses Success',
  props<{ addresses: Address[] }>()
);

export const addAddress = createAction(
  '[Address] Add Address',
  props<{ address: Address }>()
);
export const addAddressSuccess = createAction(
  '[Address] Add Address Success',
  props<{ address: Address }>()
);

export const removeAddress = createAction(
  '[Address] Remove Address',
  props<{ id: string | number }>()
);
export const removeAddressSuccess = createAction(
  '[Address] Remove Address Success',
  props<{ id: string | number }>()
);

export const clearAddresses = createAction('[Address] Clear Addresses');