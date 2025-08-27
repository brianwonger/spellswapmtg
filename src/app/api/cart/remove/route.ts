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
    // Find the specific transaction item to delete that belongs to the user
    const { data: transactionItem, error: findError } = await supabase
      .from('transaction_items')
      .select(`
        id,
        transaction_id,
        transactions!inner(id, status, buyer_id)
      `)
      .eq('user_card_id', user_card_id)
      .eq('transactions.buyer_id', user.id)
      .in('transactions.status', ['pending', 'accepted'])
      .single()

    if (findError || !transactionItem) {
      console.error('Error finding item in cart, or item does not exist:', findError)
      return NextResponse.json({ error: 'Item not found in a transaction for this user.' }, { status: 404 })
    }

    // Check if transaction is accepted - don't allow removing items if it is
    if (transactionItem.transactions[0].status === 'accepted') {
      return NextResponse.json({
        error: "Cannot remove items from cart. Transaction has already been accepted by the seller. Please coordinate with the seller to complete the transaction."
      }, { status: 400 });
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

    // If no items remain, mark the transaction as cancelled
    if (remainingItems && remainingItems.length === 0) {
      const { error: cancelTransactionError } = await supabase
        .from('transactions')
        .update({
          status: 'cancelled',
          cancelled_by: user.id,
          cancellation_reason: 'Cart emptied by buyer',
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId)

      if (cancelTransactionError) {
        // Log the error but don't block the response
        console.error('Error cancelling empty transaction:', cancelTransactionError)
      }
    }

    return NextResponse.json({ message: 'Item removed from cart successfully.' }, { status: 200 })

  } catch (error) {
    console.error('Remove from cart error:', error)
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 })
  }
}
