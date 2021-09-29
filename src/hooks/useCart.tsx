import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: productData } = await api.get(`products/${productId}`)
      const { data: stockData } = await api.get(`stock/${productId}`)
      if (productData && stockData) {
        const newCart = cart
        const productExitsIndex = cart.findIndex(product => product.id === productData.id)

        if (productExitsIndex !== -1) {
          if (stockData.amount > newCart[productExitsIndex].amount) {
            newCart[productExitsIndex].amount ++
          } else {
            toast.error('Quantidade solicitada fora de estoque')
            return
          }
        } else {
          if (stockData.amount > 0) {
            newCart.push({ ...productData, amount: 1 })
          } else {
            toast.error('Erro na adição do produto')
            return
          }
        }

        setCart([...newCart])
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      } else {
        toast.error('Erro na adição do produto')
        return;
      }
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart

      const productExists = newCart.findIndex(product => product.id === productId)
      
      if (productExists === -1) throw new Error('Erro na remoção do produto')

      newCart.splice(productExists, 1)

      setCart([...newCart])
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch (err) {
      const error = err as { message: string }
      toast.error(error.message)
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount === 0) throw new Error()
      const { data: stockData, status } = await api.get(`stock/${productId}`)
      if (!stockData || status !== 200) throw new Error ('Erro na alteração de quantidade do produto')
      const newCart = cart

      const productExists = newCart.findIndex(product => product.id === productId)

      if (productExists === -1) throw new Error('Erro na alteração de quantidade do produto')
      if (stockData.amount >= amount) {
        newCart[productExists].amount = amount
      } else {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      setCart([...newCart])
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
