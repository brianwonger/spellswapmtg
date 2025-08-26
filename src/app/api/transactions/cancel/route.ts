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
    // Verify the transaction exists and user is the buyer
    const { data: transaction, error: findTransactionError } = await supabase
      .from('transactions')
      .select('id, buyer_id, seller_id, status, notes')
      .eq('id', transaction_id)
      .eq('buyer_id', user.id)
      .single()

    if (findTransactionError || !transaction) {
      console.error('Error finding transaction:', findTransactionError)
      return NextResponse.json({
        error: 'Transaction not found or you do not have permission to cancel this transaction.'
      }, { status: 404 })
    }

    // Check if transaction is in 'accepted' status (only accepted transactions can be cancelled by buyer)
    if (transaction.status !== 'accepted') {
      return NextResponse.json({
        error: transaction.status === 'pending'
          ? 'Transaction must be accepted before it can be cancelled. Remove items from cart instead.'
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
      // Send notification message to seller
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          content: `❌ Transaction Cancelled\n\nReason: ${cancellationReason}\n\nThe transaction has been cancelled. If you believe this was done in error, please contact the buyer directly.`,
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

    return NextResponse.json({
      message: 'Transaction cancelled successfully. The seller has been notified.',
      transaction_id: transaction_id
    }, { status: 200 })

  } catch (error) {
    console.error('Cancel transaction error:', error)
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 })
  }
}
