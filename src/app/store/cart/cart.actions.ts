import { createAction,props } from "@ngrx/store";
import { Product } from "../../features/products/product.model";
import { CartItem } from "./cart.state";

export const addToCart = createAction('[Cart] Add To Cart',
  props<{product: Product; userId: number;}>()
);
export const removeFromCart = createAction('[Cart] Remove From Cart',
  props<{ productId: number }>()
);
export const increaseQuantity = createAction('[Cart] Increase Quantity',
  props<{ productId: number }>()
);
export const decreaseQuantity = createAction('[Cart] Decrease Quantity',
  props<{ productId: number }>()
);
export const updateCartQuantity = createAction('[Cart] Update Quantity',
  props<{ productId: number;quantity: number;}>()
);
export const clearCart=createAction('[Cart]Clear cart');

export const loadCart=createAction('[cart]Load cart');

export const loadCartSuccess=createAction('[Cart]load cart success',
    props<{items:CartItem[]}>()
)
