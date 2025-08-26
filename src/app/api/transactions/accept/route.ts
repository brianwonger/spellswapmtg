import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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
    // Verify the transaction exists and user is the seller
    const { data: transaction, error: findTransactionError } = await supabase
      .from('transactions')
      .select('id, buyer_id, seller_id, status')
      .eq('id', transaction_id)
      .eq('seller_id', user.id)
      .single()

    if (findTransactionError || !transaction) {
      console.error('Error finding transaction:', findTransactionError)
      return NextResponse.json({
        error: 'Transaction not found or you do not have permission to accept this transaction.'
      }, { status: 404 })
    }

    // Check if transaction is in 'pending' status (only pending transactions can be accepted)
    if (transaction.status !== 'pending') {
      return NextResponse.json({
        error: transaction.status === 'accepted'
          ? 'Transaction has already been accepted.'
          : transaction.status === 'completed'
          ? 'Transaction has already been completed.'
          : 'Transaction cannot be accepted in its current status.'
      }, { status: 400 })
    }

    // Update transaction status to 'accepted'
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction_id)

    if (updateError) {
      console.error('Error updating transaction status:', updateError)
      return NextResponse.json({ error: 'Failed to accept transaction.' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Transaction accepted successfully. You can now coordinate with the buyer to complete the exchange.',
      transaction_id: transaction_id
    }, { status: 200 })

  } catch (error) {
    console.error('Accept transaction error:', error)
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 })
  }
}
