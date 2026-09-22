import { createReducer, on } from "@ngrx/store";
import { AddressState, initialAddressState } from "./address.state";
import {
  loadAddressesSuccess,
  addAddressSuccess,
  removeAddressSuccess,
  clearAddresses
} from "./address.actions";

export const addressReducer = createReducer(initialAddressState,

  on(loadAddressesSuccess, (state, { addresses }) => ({
    ...state,
    items: addresses
  })),
  on(addAddressSuccess, (state, { address }) => ({
    ...state,
    items: [...state.items, address]
  })),
  on(removeAddressSuccess, (state, { id }) => ({
    ...state,
    items: state.items.filter(item => item.id !== id)
  })),
  on(clearAddresses, () => initialAddressState)
);