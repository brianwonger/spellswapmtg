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
    // Find the specific transaction item to delete that belongs to the user in a pending transaction
    const { data: transactionItem, error: findError } = await supabase
      .from('transaction_items')
      .select(`
        id,
        transaction_id,
        transactions!inner(id)
      `)
      .eq('user_card_id', user_card_id)
      .eq('transactions.buyer_id', user.id)
      .eq('transactions.status', 'pending')
      .single()

    if (findError || !transactionItem) {
      console.error('Error finding item in cart, or item does not exist:', findError)
      return NextResponse.json({ error: 'Item not found in a pending transaction for this user.' }, { status: 404 })
    }

    const transactionId = transactionItem.transaction_id;

    if (!transactionId) {
      return NextResponse.json({ error: 'Could not determine transaction ID.' }, { status: 500 })
    }

    // We found the item, now delete it by its primary key
    const { error: deleteError } = await supabase
      .from('transaction_items')
      .delete()
      .eq('id', transactionItem.id)

    if (deleteError) {
      console.error('Error deleting transaction item:', deleteError)
      return NextResponse.json({ error: 'Failed to remove item from cart.' }, { status: 500 })
    }

    // Check if the transaction is now empty and delete it if so
    const { data: remainingItems, error: countError } = await supabase
      .from('transaction_items')
      .select('id')
      .eq('transaction_id', transactionId)
      .limit(1)

    if (countError) {
      // Log the error but don't block the response
      console.error('Error checking for remaining items:', countError)
    }

    // If no items remain, delete the parent transaction
    if (remainingItems && remainingItems.length === 0) {
      const { error: deleteTransactionError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)

      if (deleteTransactionError) {
        // Log the error but don't block the response
        console.error('Error deleting empty transaction:', deleteTransactionError)
      }
    }

    return NextResponse.json({ message: 'Item removed from cart successfully.' }, { status: 200 })

  } catch (error) {
    console.error('Remove from cart error:', error)
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 })
  }
}
