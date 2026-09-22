import { createFeatureSelector, createSelector } from "@ngrx/store";
import { AddressState } from "./address.state";

export const selectAddressState = createFeatureSelector<AddressState>('address');
export const selectAddresses = createSelector(selectAddressState, state => state.items);