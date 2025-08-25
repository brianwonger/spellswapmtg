import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { conversationId, messageIds, markAll } = body

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 })
    }

    let result

    if (markAll) {
      // Mark all unread messages in the conversation as read
      const { data, error } = await supabase.rpc('mark_conversation_messages_as_read', {
        conversation_uuid: conversationId,
        user_uuid: user.id
      })

      if (error) {
        console.error('Error marking conversation messages as read:', error)
        return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 })
      }

      result = { updatedCount: data }
    } else if (messageIds && Array.isArray(messageIds)) {
      // Mark specific messages as read
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', messageIds)
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id) // Only mark messages from other users
        .eq('is_read', false) // Only mark unread messages

      if (error) {
        console.error('Error marking specific messages as read:', error)
        return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 })
      }

      result = { updatedCount: messageIds.length }
    } else {
      return NextResponse.json({ error: 'Either markAll or messageIds array is required' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error) {
    console.error('Error in mark-read API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Also support PUT method for updating specific messages
export async function PUT(request: Request) {
  return POST(request)
}
