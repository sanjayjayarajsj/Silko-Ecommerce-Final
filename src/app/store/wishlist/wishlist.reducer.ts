import { createReducer,on } from "@ngrx/store";
import { addToWishlist,removeFromWishlist,loadwishlistsuccess } from "./wishlist.actions";
import { WishlistState,initialWishlistState } from "./wishlist.state";
import { clearWishlist } from './wishlist.actions';

export const wishlistReducer=createReducer(initialWishlistState,
on(addToWishlist, (state, { product, userId }) => {
  const alreadyExists = state.items.some(
    item =>item.product.id === product.id &&item.userId === userId
  );
  if (alreadyExists) {
    return state;
  }
  return {
    ...state,
    items: [
      ...state.items,
      {
        userId: userId,
        product: product
      }
    ]
  };
}),
on(removeFromWishlist,(state,{productId})=>({
    ...state,items:state.items.filter(item=>item.product.id!==productId)
})),
on(loadwishlistsuccess,(state,{items})=>({
    ...state,items:items
})),
on(clearWishlist, () => initialWishlistState),
);