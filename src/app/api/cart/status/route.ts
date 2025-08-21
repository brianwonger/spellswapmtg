import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userCardIds = searchParams.get('user_card_ids')?.split(',')

  if (!userCardIds || userCardIds.length === 0) {
    return NextResponse.json({ error: 'user_card_ids parameter is required' }, { status: 400 })
  }

  try {
    // Get all pending transactions for this buyer
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select(`
        id,
        seller_id,
        transaction_items!inner (
          user_card_id
        )
      `)
      .eq('buyer_id', user.id)
      .eq('status', 'pending')
      .in('transaction_items.user_card_id', userCardIds)

    if (transactionError) {
      console.error('Error fetching cart status:', transactionError)
      throw new Error('Could not fetch cart status.')
    }

    // Extract the user_card_ids that are in the cart
    const cartItems = new Set<string>()
    transactions?.forEach(transaction => {
      transaction.transaction_items.forEach(item => {
        cartItems.add(item.user_card_id)
      })
    })

    // Return a mapping of user_card_id to boolean (in cart or not)
    const cartStatus: Record<string, boolean> = {}
    userCardIds.forEach(cardId => {
      cartStatus[cardId] = cartItems.has(cardId)
    })

    return NextResponse.json(cartStatus, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'An unexpected error occurred.' }, { status: 500 })
  }
}
