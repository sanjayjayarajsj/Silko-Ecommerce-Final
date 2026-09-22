import { Address } from "../../features/address/address.model";

export interface AddressState {
  items: Address[];
}

export const initialAddressState: AddressState = {
  items: []
};