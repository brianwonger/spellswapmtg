import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user_card_id } = await request.json()

  if (!user_card_id) {
    return NextResponse.json({ error: 'user_card_id is required' }, { status: 400 })
  }

  try {
    // 1. Get seller_id from the user_card to find the right transaction
    const { data: cardData, error: cardError } = await supabase
      .from('user_cards')
      .select('user_id')
      .eq('id', user_card_id)
      .single()

    if (cardError || !cardData) {
      console.error('Error fetching card data:', cardError)
      return NextResponse.json({ error: 'Card not found or error fetching data.' }, { status: 404 })
    }

    const seller_id = cardData.user_id

    // 2. Find the pending transaction between buyer and seller
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('id')
      .eq('buyer_id', user.id)
      .eq('seller_id', seller_id)
      .eq('status', 'pending')
      .single()

    if (transactionError || !transaction) {
      return NextResponse.json({ error: 'No pending transaction found for this seller.' }, { status: 404 })
    }

    // 3. Remove the item from transaction_items
    const { error: removeError } = await supabase
      .from('transaction_items')
      .delete()
      .eq('transaction_id', transaction.id)
      .eq('user_card_id', user_card_id)

    if (removeError) {
      console.error('Error removing item from transaction:', removeError)
      throw new Error('Could not remove item from cart.')
    }

    // 4. Check if the transaction has any remaining items
    const { data: remainingItems, error: countError } = await supabase
      .from('transaction_items')
      .select('id')
      .eq('transaction_id', transaction.id)

    if (countError) {
      console.error('Error checking remaining items:', countError)
      // Don't fail the operation if we can't check remaining items
    }

    // 5. If no items remain, delete the empty transaction
    if (remainingItems && remainingItems.length === 0) {
      const { error: deleteTransactionError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id)

      if (deleteTransactionError) {
        console.error('Error deleting empty transaction:', deleteTransactionError)
        // Don't fail the operation if we can't delete the empty transaction
      }
    }

    return NextResponse.json({ message: 'Item removed from cart successfully.' }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'An unexpected error occurred.' }, { status: 500 })
  }
}
