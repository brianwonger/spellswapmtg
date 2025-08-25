import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First get conversation IDs where user is a participant
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)

    if (convError) {
      console.error('Error fetching conversations:', convError)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({ count: 0 })
    }

    const conversationIds = conversations.map(conv => conv.id)

    // Count unread messages where user is a participant but not the sender
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .neq('sender_id', user.id)
      .in('conversation_id', conversationIds)

    if (error) {
      console.error('Error fetching unread message count:', error)
      return NextResponse.json({ error: 'Failed to fetch unread count' }, { status: 500 })
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error('Error in unread message count API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
