import { createAction,props } from "@ngrx/store";
import { Product } from "../../features/products/product.model";
import { WishlistItem } from "./wishlist.state";
export const addToWishlist = createAction('[Wishlist] Add To Wishlist',
props<{product: Product;userId: number;}>()
);
export const removeFromWishlist=createAction('[Wishlist]Remove from wishlist',
props<{productId:number}>()
);
export const loadwishlist=createAction('[Wishlist]load products');
export const loadwishlistsuccess=createAction('[Wishlist]load wishlist success',
props<{items: WishlistItem[]}>()
);
export const clearWishlist = createAction('[Wishlist] Clear Wishlist'
);
