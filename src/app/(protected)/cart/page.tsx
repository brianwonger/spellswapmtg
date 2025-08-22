'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'

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
  seller_id: string;
  seller_name: string | null;
  transaction_items: CartItem[];
}


const FALLBACK_CARD_IMAGE = "https://cards.scryfall.io/large/front/0/c/0c082aa8-bf7f-47f2-baf8-43ad253fd7d7.jpg"

export default function CartPage() {
  const [groupedBySeller, setGroupedBySeller] = useState<Record<string, TransactionWithItems>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

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
        .eq('status', 'pending')

      if (error) {
        console.error('Error fetching transactions:', error)
        setError('Error loading your cart. Please try again later.')
      } else if (transactions) {
        const grouped: Record<string, TransactionWithItems> = transactions.reduce((acc, tx: any) => {
          const sellerId = tx.seller.id;
          const sellerName = tx.seller.display_name;
          if (!acc[sellerId]) {
            acc[sellerId] = { id: tx.id, seller_id: sellerId, seller_name: sellerName, transaction_items: [] };
          }

          // Parse image_uris for each transaction item
          const processedItems = tx.transaction_items.map((item: any) => {
            let imageUris;
            try {
              imageUris = typeof item.user_cards.default_cards.image_uris === 'string'
                ? JSON.parse(item.user_cards.default_cards.image_uris)
                : item.user_cards.default_cards.image_uris;
            } catch (e) {
              console.error('Error parsing image_uris:', e);
              imageUris = null;
            }

            return {
              ...item,
              user_cards: {
                ...item.user_cards,
                default_cards: {
                  ...item.user_cards.default_cards,
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


  if (isLoading) {
    return <div className="container py-8">Loading your cart...</div>
  }

  if (error) {
    return <div className="container py-8">{error}</div>
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Your Shopping Cart</h1>
      
      {Object.keys(groupedBySeller).length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <div className="space-y-8">
          {Object.values(groupedBySeller).map((transaction) => (
            <Card key={transaction.seller_id}>
              <CardHeader>
                <CardTitle>
                  Items from <Link href={`/marketplace/seller/${encodeURIComponent(transaction.seller_name || transaction.seller_id)}`} className="text-blue-600 hover:underline">{transaction.seller_name}</Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {transaction.transaction_items.map((item) => (
                    <li key={item.id} className="flex items-center gap-4">
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
                      <div>
                        <p className="font-semibold">${item.agreed_price.toFixed(2)}</p>
                        <p className="text-sm text-right text-gray-500">Qty: {item.quantity}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Separator className="my-4" />
                <div className="flex justify-end items-center">
                   <Button onClick={() => handleContactSeller(transaction.id)}>Contact Seller to Purchase</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
