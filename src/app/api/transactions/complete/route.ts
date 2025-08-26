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
    // Verify the transaction exists and user is the buyer
    const { data: transaction, error: findTransactionError } = await supabase
      .from('transactions')
      .select('id, buyer_id, seller_id, status')
      .eq('id', transaction_id)
      .eq('buyer_id', user.id)
      .single()

    if (findTransactionError || !transaction) {
      console.error('Error finding transaction:', findTransactionError)
      return NextResponse.json({
        error: 'Transaction not found or you do not have permission to complete this transaction.'
      }, { status: 404 })
    }

    // Check if transaction is in 'accepted' status (only accepted transactions can be completed)
    if (transaction.status !== 'accepted') {
      return NextResponse.json({
        error: 'Transaction must be accepted before it can be marked as complete.'
      }, { status: 400 })
    }

    // Update transaction status to 'completed'
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction_id)

    if (updateError) {
      console.error('Error updating transaction status:', updateError)
      return NextResponse.json({ error: 'Failed to complete transaction.' }, { status: 500 })
    }

    // TODO: Implement payment transfer logic here when payment feature is added

    return NextResponse.json({
      message: 'Transaction marked as complete successfully. Payment will be transferred once the payment feature is implemented.',
      transaction_id: transaction_id
    }, { status: 200 })

  } catch (error) {
    console.error('Complete transaction error:', error)
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 })
  }
}
