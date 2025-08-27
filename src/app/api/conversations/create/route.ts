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
    // 1. Fetch transaction to verify buyer and get seller
    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .select('buyer_id, seller_id')
      .eq('id', transaction_id)
      .single()

    if (transactionError || !transactionData) {
      console.error('Error fetching transaction:', transactionError)
      return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 })
    }

    if (transactionData.buyer_id !== user.id) {
      return NextResponse.json({ error: 'You are not the buyer for this transaction.' }, { status: 403 })
    }

    // 2. Check if a conversation already exists for this transaction
    const { data: existingConversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id')
      .eq('transaction_id', transaction_id)
      .single()

    if (conversationError && conversationError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking for existing conversation:', conversationError)
      throw new Error('Error checking for existing conversation.')
    }

    if (existingConversation) {
      return NextResponse.json({ conversation_id: existingConversation.id }, { status: 200 })
    }

    // 3. Create a new conversation
    const { data: newConversation, error: newConversationError } = await supabase
      .from('conversations')
      .insert({
        transaction_id: transaction_id,
        participant1_id: transactionData.buyer_id,
        participant2_id: transactionData.seller_id,
      })
      .select('id')
      .single()

    if (newConversationError || !newConversation) {
      console.error('Error creating conversation:', newConversationError)
      throw new Error('Could not create a new conversation.')
    }

    return NextResponse.json({ conversation_id: newConversation.id }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'An unexpected error occurred.' }, { status: 500 })
  }
}
