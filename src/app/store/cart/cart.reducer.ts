import { createReducer,on } from "@ngrx/store";
import { addToCart,removeFromCart,increaseQuantity,decreaseQuantity,updateCartQuantity,clearCart,loadCart,loadCartSuccess } from "./cart.actions";
import { CartState,initialCartState,MAX_QUANTITY_PER_PRODUCT } from "./cart.state";

export const cartReducer = createReducer(initialCartState,

on(addToCart, (state, { product, userId }) => {
    const existingItem = state.items.find(
      item => item.product.id === product.id
    );
    if (existingItem) {
      // Already in the cart — Add to Cart should not silently bump the
      // quantity. Only the +/- controls on the cart page do that.
      return state;
    }
   return {
  ...state,
  items: [
    ...state.items,
    {
      userId: userId,
      product: product,
      quantity: 1
    }
  ]
};
  }),

  on(removeFromCart, (state, { productId }) => ({...state,
    items: state.items.filter(
      item => item.product.id !== productId
    )
  })),

  on(increaseQuantity,(state,{ productId }) =>({...state,
    items: state.items.map(item =>
      item.product.id === productId
        ? {
            ...item,
            quantity: Math.min(item.quantity + 1, MAX_QUANTITY_PER_PRODUCT)
          }
        :item)
  })),

  on(decreaseQuantity, (state, { productId }) => ({...state,
    items: state.items
      .map(item =>
        item.product.id === productId
          ? {
              ...item,
              quantity: item.quantity - 1
            }
          : item
      )
      .filter(item => item.quantity > 0)
  })),
  on(updateCartQuantity, (state, { productId, quantity }) => ({
  ...state,
  items: state.items.map(item =>
    item.product.id === productId
      ? {
          ...item,
          quantity: Math.min(quantity, MAX_QUANTITY_PER_PRODUCT)
        }
      : item
  )
})),
  on(clearCart,(state)=>({...state,
    items:[]
  })),
  on(loadCart,(state)=>({
    ...state
  })),
  on(loadCartSuccess,(state,{items})=>({
    ...state,items:items
  }))
)