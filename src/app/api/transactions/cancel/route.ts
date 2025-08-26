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

  const { transaction_id, reason } = await request.json()

  if (!transaction_id) {
    return NextResponse.json({ error: 'transaction_id is required' }, { status: 400 })
  }

  if (!reason || reason.trim().length === 0) {
    return NextResponse.json({ error: 'Cancellation reason is required' }, { status: 400 })
  }

  if (reason.trim().length > 1000) {
    return NextResponse.json({ error: 'Cancellation reason must be less than 1000 characters' }, { status: 400 })
  }

  try {
    // Verify the transaction exists and user is either buyer or seller
    const { data: transaction, error: findTransactionError } = await supabase
      .from('transactions')
      .select('id, buyer_id, seller_id, status, notes')
      .eq('id', transaction_id)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .single()

    if (findTransactionError || !transaction) {
      console.error('Error finding transaction:', findTransactionError)
      console.error('Transaction ID:', transaction_id)
      console.error('User ID:', user.id)
      return NextResponse.json({
        error: 'Transaction not found or you do not have permission to cancel this transaction.'
      }, { status: 404 })
    }

    // Determine user role
    const isBuyer = transaction.buyer_id === user.id
    const isSeller = transaction.seller_id === user.id

    console.log('Transaction found:', {
      id: transaction.id,
      status: transaction.status,
      buyer_id: transaction.buyer_id,
      seller_id: transaction.seller_id,
      user_id: user.id,
      isBuyer,
      isSeller
    })

    // Check cancellation permissions based on user role and transaction status
    if (isBuyer && transaction.status !== 'accepted') {
      return NextResponse.json({
        error: transaction.status === 'pending'
          ? 'Transaction must be accepted before it can be cancelled. Remove items from cart instead.'
          : transaction.status === 'completed'
          ? 'Transaction has already been completed and cannot be cancelled.'
          : 'Transaction cannot be cancelled in its current status.'
      }, { status: 400 })
    }

    if (isSeller && !['pending', 'open'].includes(transaction.status)) {
      return NextResponse.json({
        error: transaction.status === 'accepted'
          ? 'Cannot cancel an accepted transaction. Please coordinate with the buyer.'
          : transaction.status === 'completed'
          ? 'Transaction has already been completed and cannot be cancelled.'
          : 'Transaction cannot be cancelled in its current status.'
      }, { status: 400 })
    }

    const cancellationReason = reason.trim()

    // Update transaction status and add cancellation details
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'cancelled',
        cancelled_by: user.id,
        cancellation_reason: cancellationReason,
        notes: transaction.notes
          ? `${transaction.notes}\n\nCANCELLED: ${cancellationReason}`
          : `CANCELLED: ${cancellationReason}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction_id)

    if (updateError) {
      console.error('Error updating transaction status:', updateError)
      return NextResponse.json({ error: 'Failed to cancel transaction.' }, { status: 500 })
    }

    // Get conversation for this transaction to send notification message
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id')
      .eq('transaction_id', transaction_id)
      .single()

    if (conversation && !conversationError) {
      // Send notification message to the other party
      const recipientRole = isBuyer ? 'seller' : 'buyer'
      const notificationMessage = `❌ Transaction Cancelled\n\nReason: ${cancellationReason}\n\nThe transaction has been cancelled by the ${isBuyer ? 'buyer' : 'seller'}. If you believe this was done in error, please contact the ${recipientRole} directly.`

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: notificationMessage,
        })

      if (messageError) {
        console.error('Error sending cancellation notification:', messageError)
        // Don't fail the whole operation if message sending fails
      }

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id)
    }

    const successMessage = `Transaction cancelled successfully. The ${isBuyer ? 'seller' : 'buyer'} has been notified.`

    return NextResponse.json({
      message: successMessage,
      transaction_id: transaction_id
    }, { status: 200 })

  } catch (error) {
    console.error('Cancel transaction error:', error)
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 })
  }
}
