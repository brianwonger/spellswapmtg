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

  const { transaction_id } = await request.json()

  if (!transaction_id) {
    return NextResponse.json({ error: 'transaction_id is required' }, { status: 400 })
  }

  try {
    // First, verify that the transaction belongs to the user and is in pending or accepted status
    const { data: transaction, error: findTransactionError } = await supabase
      .from('transactions')
      .select('id, buyer_id, status')
      .eq('id', transaction_id)
      .eq('buyer_id', user.id)
      .in('status', ['pending', 'accepted'])
      .single()

    if (findTransactionError || !transaction) {
      console.error('Error finding transaction or transaction does not exist:', findTransactionError)
      return NextResponse.json({
        error: 'Transaction not found or you do not have permission to clear this cart.'
      }, { status: 404 })
    }

    // Check if transaction is accepted - don't allow clearing cart if it is
    if (transaction.status === 'accepted') {
      return NextResponse.json({
        error: "Cannot clear cart. Transaction has already been accepted by the seller. Please coordinate with the seller to complete the transaction."
      }, { status: 400 });
    }

    // Delete all transaction items for this transaction
    const { error: deleteItemsError } = await supabase
      .from('transaction_items')
      .delete()
      .eq('transaction_id', transaction_id)

    if (deleteItemsError) {
      console.error('Error deleting transaction items:', deleteItemsError)
      return NextResponse.json({ error: 'Failed to clear cart items.' }, { status: 500 })
    }

    // Mark the transaction as cancelled since it will be empty
    const { error: cancelTransactionError } = await supabase
      .from('transactions')
      .update({
        status: 'cancelled',
        cancelled_by: user.id,
        cancellation_reason: 'Cart cleared by buyer',
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction_id)

    if (cancelTransactionError) {
      console.error('Error cancelling transaction:', cancelTransactionError)
      return NextResponse.json({ error: 'Failed to clear cart.' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Cart cleared successfully.',
      transaction_id: transaction_id
    }, { status: 200 })

  } catch (error) {
    console.error('Clear cart error:', error)
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 })
  }
}
