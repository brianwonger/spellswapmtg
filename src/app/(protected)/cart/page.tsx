'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { Trash2, ShoppingCart } from 'lucide-react'

type CartItem = {
  id: string;
  quantity: number;
  agreed_price: number;
  condition: string;
  user_cards: {
    id: string;
    default_cards: {
      name: string;
      set_name: string;
      image_uris: {
        normal?: string;
        small?: string;
        large?: string;
        art_crop?: string;
        border_crop?: string;
      } | null;
    }
  }
}

type TransactionWithItems = {
  id: string;
  status: string;
  seller_id: string;
  seller_name: string | null;
  transaction_items: CartItem[];
}

type SupabaseTransaction = {
  id: string;
  status: string;
  seller: {
    id: string;
    display_name: string | null;
  }[];
  transaction_items: SupabaseTransactionItem[];
}

type SupabaseTransactionItem = {
  id: string;
  quantity: number;
  agreed_price: number;
  condition: string;
  user_cards: {
    id: string;
    default_cards: {
      name: string;
      set_name: string;
      image_uris: string | null;
    }[];
  }[];
}

const FALLBACK_CARD_IMAGE = "https://cards.scryfall.io/large/front/0/c/0c082aa8-bf7f-47f2-baf8-43ad253fd7d7.jpg"

export default function CartPage() {
  const [groupedBySeller, setGroupedBySeller] = useState<Record<string, TransactionWithItems>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set())
  const [clearingCarts, setClearingCarts] = useState<Set<string>>(new Set())
  const [submittingCarts, setSubmittingCarts] = useState<Set<string>>(new Set())
  const router = useRouter()

  const clearMessages = () => {
    setError(null)
    setSuccessMessage(null)
  }

  useEffect(() => {
    const fetchCart = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          id,
          status,
          seller:profiles!transactions_seller_id_fkey(
            id,
            display_name
          ),
          transaction_items (
            id,
            quantity,
            agreed_price,
            condition,
            user_cards (
              id,
              default_cards (
                name,
                set_name,
                image_uris
              )
            )
          )
        `)
        .eq('buyer_id', user.id)
        .in('status', ['open', 'pending'])

      if (error) {
        console.error('Error fetching transactions:', error)
        setError('Error loading your cart. Please try again later.')
      } else if (transactions) {
        const grouped: Record<string, TransactionWithItems> = transactions.reduce((acc: Record<string, TransactionWithItems>, tx: SupabaseTransaction) => {
          const sellerId = tx.seller[0].id;
          const sellerName = tx.seller[0].display_name;
          if (!acc[sellerId]) {
            acc[sellerId] = { id: tx.id, status: tx.status, seller_id: sellerId, seller_name: sellerName, transaction_items: [] };
          }

          // Parse image_uris for each transaction item
          const processedItems = tx.transaction_items.map((item: SupabaseTransactionItem) => {
            let imageUris;
            try {
              imageUris = typeof item.user_cards[0].default_cards[0].image_uris === 'string'
                ? JSON.parse(item.user_cards[0].default_cards[0].image_uris)
                : item.user_cards[0].default_cards[0].image_uris;
            } catch (e) {
              console.error('Error parsing image_uris:', e);
              imageUris = null;
            }

            return {
              ...item,
              user_cards: {
                ...item.user_cards[0],
                default_cards: {
                  ...item.user_cards[0].default_cards[0],
                  image_uris: imageUris
                }
              }
            };
          });

          acc[sellerId].transaction_items.push(...processedItems);
          return acc;
        }, {});
        setGroupedBySeller(grouped)
      }
      setIsLoading(false)
    }

    fetchCart()
  }, [router])
  
  const handleSubmitCart = async (transactionId: string) => {
    clearMessages()
    setSubmittingCarts(prev => new Set(prev).add(transactionId))

    try {
      const response = await fetch('/api/transactions/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transaction_id: transactionId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit cart.')
      }

      // Remove the submitted cart from the local state
      setGroupedBySeller(prev => {
        const newState = { ...prev }
        const sellerKey = Object.keys(newState).find(key =>
          newState[key].id === transactionId
        )
        if (sellerKey) {
          delete newState[sellerKey]
        }
        return newState
      })

      setSuccessMessage('Cart submitted to seller successfully! You will be notified when they respond.')

    } catch (error) {
      console.error('Error submitting cart:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit cart. Please try again.')
    } finally {
      setSubmittingCarts(prev => {
        const newSet = new Set(prev)
        newSet.delete(transactionId)
        return newSet
      })
    }
  };

  const handleContactSeller = async (transaction_id: string) => {
    try {
        const response = await fetch('/api/conversations/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ transaction_id }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to start conversation.');
        }

        router.push(`/messages`);

    } catch (error) {
        console.error('Error starting conversation:', error);
        // You might want to show an error toast here
    }
  };

  const handleRemoveItem = async (itemId: string, userCardId: string, transactionId: string) => {
    clearMessages()
    setRemovingItems(prev => new Set(prev).add(itemId))

    try {
      const response = await fetch('/api/cart/remove', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_card_id: userCardId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove item from cart.')
      }

      // Remove the item from the local state
      setGroupedBySeller(prev => {
        const newState = { ...prev }
        const transaction = newState[Object.keys(newState).find(key =>
          newState[key].id === transactionId
        )!]

        if (transaction) {
          transaction.transaction_items = transaction.transaction_items.filter(
            item => item.id !== itemId
          )

          // If no items left in transaction, remove the entire transaction
          if (transaction.transaction_items.length === 0) {
            delete newState[Object.keys(newState).find(key =>
              newState[key].id === transactionId
            )!]
          }
        }

        return newState
      })

      setSuccessMessage('Item removed from cart successfully.')

    } catch (error) {
      console.error('Error removing item:', error)
      setError('Failed to remove item from cart. Please try again.')
    } finally {
      setRemovingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  };

  const handleClearCart = async (transactionId: string) => {
    clearMessages()
    setClearingCarts(prev => new Set(prev).add(transactionId))

    try {
      const response = await fetch('/api/cart/clear', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transaction_id: transactionId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to clear cart.')
      }

      // Remove the entire transaction from local state
      setGroupedBySeller(prev => {
        const newState = { ...prev }
        const sellerKey = Object.keys(newState).find(key =>
          newState[key].id === transactionId
        )
        if (sellerKey) {
          delete newState[sellerKey]
        }
        return newState
      })

      setSuccessMessage('Cart cleared successfully.')

    } catch (error) {
      console.error('Error clearing cart:', error)
      setError('Failed to clear cart. Please try again.')
    } finally {
      setClearingCarts(prev => {
        const newSet = new Set(prev)
        newSet.delete(transactionId)
        return newSet
      })
    }
  };


  if (isLoading) {
    return <div className="container py-8">Loading your cart...</div>
  }

  if (error) {
    return <div className="container py-8">{error}</div>
  }

  return (
    <div className="container py-8">
      {(error || successMessage) && (
        <div className="mb-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="text-red-700 hover:text-red-800"
              >
                ×
              </Button>
            </div>
          )}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
              <span>{successMessage}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuccessMessage(null)}
                className="text-green-700 hover:text-green-800"
              >
                ×
              </Button>
            </div>
          )}
        </div>
      )}
      <h1 className="text-3xl font-bold mb-6">Your Shopping Cart</h1>
      
      {Object.keys(groupedBySeller).length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <div className="space-y-8">
          {Object.values(groupedBySeller).map((transaction) => (
            <Card key={transaction.seller_id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>
                    Items from <Link href={`/marketplace/seller/${encodeURIComponent(transaction.seller_name || transaction.seller_id)}`} className="text-blue-600 hover:underline">{transaction.seller_name}</Link>
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleClearCart(transaction.id)}
                    disabled={clearingCarts.has(transaction.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {clearingCarts.has(transaction.id) ? (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Clearing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear Cart
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {transaction.transaction_items.map((item) => (
                    <li key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <Image
                        src={item.user_cards.default_cards.image_uris?.normal || FALLBACK_CARD_IMAGE}
                        alt={item.user_cards.default_cards.name}
                        width={64}
                        height={64}
                        className="rounded-md object-cover"
                      />
                      <div className="flex-grow">
                        <p className="font-semibold">{item.user_cards.default_cards.name}</p>
                        <p className="text-sm text-gray-500">{item.user_cards.default_cards.set_name}</p>
                        <p className="text-sm text-gray-500">Condition: {item.condition}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${item.agreed_price.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id, item.user_cards.id, transaction.id)}
                        disabled={removingItems.has(item.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {removingItems.has(item.id) ? (
                          <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
                <Separator className="my-4" />
                <div className="flex justify-end items-center space-x-2">
                  {transaction.status === 'open' && (
                    <Button 
                      onClick={() => handleSubmitCart(transaction.id)}
                      disabled={submittingCarts.has(transaction.id)}
                    >
                      {submittingCarts.has(transaction.id) ? 'Submitting...' : 'Submit to Seller'}
                    </Button>
                  )}
                  {transaction.status === 'pending' && (
                    <p className="text-sm text-gray-500 italic">Waiting for seller to respond.</p>
                  )}
                   <Button variant="secondary" onClick={() => handleContactSeller(transaction.id)}>Contact Seller</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
