import {createFeatureSelector,createSelector} from '@ngrx/store';
import { WishlistState } from './wishlist.state';

export const selectWishlistState=createFeatureSelector<WishlistState>('wishlist');
export const selectWishlistItems=createSelector(selectWishlistState,(state)=>state.items.filter(item=>!item.product.isDeleted));
export const selectWishlistCount=createSelector(selectWishlistItems,(items) => items.length);