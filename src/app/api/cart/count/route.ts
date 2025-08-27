import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get count of unique seller transactions that are pending
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select('id')
      .eq('buyer_id', user.id)
      .eq('status', 'pending')

    if (transactionError) {
      console.error('Error fetching cart count:', transactionError)
      throw new Error('Could not fetch cart count.')
    }

    return NextResponse.json({ count: transactions?.length || 0 }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred.' }, 
      { status: 500 }
    )
  }
}