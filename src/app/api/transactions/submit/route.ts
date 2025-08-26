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
    // 1. Fetch the transaction and its items
    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .select(
        `
        *,
        transaction_items ( agreed_price )
      `
      )
      .eq('id', transaction_id)
      .eq('buyer_id', user.id)
      .single()

    if (transactionError || !transactionData) {
      console.error('Error fetching transaction:', transactionError)
      return NextResponse.json({ error: 'Transaction not found or you are not the buyer.' }, { status: 404 })
    }

    // 2. Verify the status is 'open'
    if (transactionData.status !== 'open') {
      return NextResponse.json({ error: 'Transaction is not open for submission.' }, { status: 400 })
    }
    
    // 3. Ensure there are items in the transaction
    if (!transactionData.transaction_items || transactionData.transaction_items.length === 0) {
      return NextResponse.json({ error: 'Cannot submit an empty cart.' }, { status: 400 })
    }

    // 4. Calculate total_amount
    const total_amount = transactionData.transaction_items.reduce(
      (sum: number, item: { agreed_price: number }) => sum + item.agreed_price,
      0
    )

    // 5. Update the transaction
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'pending',
        total_amount: total_amount,
      })
      .eq('id', transaction_id)

    if (updateError) {
      console.error('Error updating transaction:', updateError)
      throw new Error('Could not update transaction.')
    }

    return NextResponse.json({ message: 'Transaction submitted successfully.' }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'An unexpected error occurred.' }, { status: 500 })
  }
}
