import { createReducer,on } from "@ngrx/store";
import { addToCart,removeFromCart,increaseQuantity,decreaseQuantity,updateCartQuantity,clearCart,loadCart,loadCartSuccess } from "./cart.actions";
import { CartState,initialCartState } from "./cart.state";

export const cartReducer = createReducer(initialCartState,

on(addToCart, (state, { product, userId }) => {
    const existingItem = state.items.find(
      item => item.product.id === product.id
    );
    if (existingItem) {
      return {...state,
        items: state.items.map(item =>
          item.product.id === product.id?{...item,
                quantity: item.quantity + 1}:item)
      };
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
            quantity: item.quantity + 1
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
          quantity: quantity
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
