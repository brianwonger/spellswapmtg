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

  const { user_card_id } = await request.json()

  if (!user_card_id) {
    return NextResponse.json({ error: 'user_card_id is required' }, { status: 400 })
  }

  try {
    // 1. Get seller_id and sale_price from the user_card
    const { data: cardData, error: cardError } = await supabase
      .from('user_cards')
      .select('user_id, sale_price, condition')
      .eq('id', user_card_id)
      .single()

    if (cardError || !cardData) {
      console.error('Error fetching card data:', cardError)
      return NextResponse.json({ error: 'Card not found or error fetching data.' }, { status: 404 })
    }

    const seller_id = cardData.user_id
    const sale_price = cardData.sale_price
    const condition = cardData.condition

    if (seller_id === user.id) {
      return NextResponse.json({ error: "You cannot add your own card to the cart." }, { status: 400 });
    }

    // 2. Find an existing 'open' transaction or create a new one
    let transaction_id: string

    const { data: existingTransaction, error: transactionError } = await supabase
      .from('transactions')
      .select('id, status')
      .eq('buyer_id', user.id)
      .eq('seller_id', seller_id)
      .in('status', ['open', 'pending', 'accepted'])
      .single()

    if (transactionError && transactionError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error finding transaction:', transactionError)
      throw new Error('Error finding existing transaction.')
    }

    if (existingTransaction) {
      // Prevent adding items if transaction is pending or accepted
      if (['pending', 'accepted'].includes(existingTransaction.status)) {
        return NextResponse.json({
          error: "Cannot add items to cart. A transaction with this seller is already pending or has been accepted."
        }, { status: 400 });
      }
      transaction_id = existingTransaction.id
    } else {
      const { data: newTransaction, error: newTransactionError } = await supabase
        .from('transactions')
        .insert({
          buyer_id: user.id,
          seller_id: seller_id,
          status: 'open',
        })
        .select('id')
        .single()

      if (newTransactionError || !newTransaction) {
        console.error('Error creating transaction:', newTransactionError)
        throw new Error('Could not create a new transaction.')
      }
      transaction_id = newTransaction.id
    }
    
    // 3. Check if the item is already in the transaction
    const { data: existingItem, error: existingItemError } = await supabase
        .from('transaction_items')
        .select('id')
        .eq('transaction_id', transaction_id)
        .eq('user_card_id', user_card_id)
        .single();

    if (existingItemError && existingItemError.code !== 'PGRST116') {
        console.error('Error checking for existing transaction item:', existingItemError);
        throw new Error('Error checking for existing item in transaction.');
    }

    if (existingItem) {
        return NextResponse.json({ message: 'Item is already in the cart.' }, { status: 200 });
    }


    // 4. Add the card to transaction_items
    const { error: itemError } = await supabase.from('transaction_items').insert({
      transaction_id,
      user_card_id,
      quantity: 1, // Defaulting to 1 for now
      agreed_price: sale_price,
      condition: condition
    })

    if (itemError) {
      console.error('Error adding item to transaction:', itemError)
      throw new Error('Could not add item to transaction.')
    }

    return NextResponse.json({ message: 'Card added to cart successfully.', transaction_id }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'An unexpected error occurred.' }, { status: 500 })
  }
}
