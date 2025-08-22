'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, FormEvent, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Send, Check, CheckCheck, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// Define types for our data
type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

type Conversation = {
  id: string;
  other_participant: Profile;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
  transaction_id: string | null;
}

type Message = {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
    is_read?: boolean;
}

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

type TransactionItem = {
    id: string;
    agreed_price: number;
    condition: string;
    user_cards: {
        default_cards: {
            name: string;
            image_uris: any;
        }
    }
}

const FALLBACK_CARD_IMAGE = "https://cards.scryfall.io/large/front/0/c/0c082aa8-bf7f-47f2-baf8-43ad253fd7d7.jpg"

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messageStatuses, setMessageStatuses] = useState<Record<string, MessageStatus>>({});
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper function to render message status icon
  const renderMessageStatus = (messageId: string) => {
    const status = messageStatuses[messageId] || 'delivered';
    const isOwnMessage = messages.find(m => m.id === messageId)?.sender_id === userId;

    if (!isOwnMessage) return null;

    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  useEffect(() => {
    const fetchConversations = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id)

      // Fetch conversations where the user is a participant
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          last_message_at,
          transaction_id,
          participant1:profiles!conversations_participant1_id_fkey(id, display_name, avatar_url),
          participant2:profiles!conversations_participant2_id_fkey(id, display_name, avatar_url)
        `)
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`);

      if (error) {
        console.error("Error fetching conversations:", error);
        setIsLoading(false);
        return;
      }
      
      const formattedConversations: Conversation[] = data.map((conv: any) => {
          const otherParticipant = conv.participant1.id === user.id ? conv.participant2 : conv.participant1;
          return {
              id: conv.id,
              other_participant: otherParticipant,
              last_message: "Last message placeholder...", // TODO: Fetch last message
              last_message_at: conv.last_message_at,
              unread_count: 0, // TODO: Implement unread count
              transaction_id: conv.transaction_id,
          }
      }).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());


      setConversations(formattedConversations);
      if (formattedConversations.length > 0) {
        setSelectedConversation(formattedConversations[0]);
      }
      setIsLoading(false);
    };

    fetchConversations();
  }, [router]);

  useEffect(() => {
    const fetchMessagesAndItems = async () => {
        if (!selectedConversation) return;

        const supabase = createClient();

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', selectedConversation.id)
            .order('created_at', { ascending: true });

        if (messagesError) {
            console.error("Error fetching messages:", messagesError);
        } else {
            setMessages(messagesData);
        }

        // Fetch transaction items
        if (selectedConversation.transaction_id) {
            const { data: itemsData, error: itemsError } = await supabase
                .from('transaction_items')
                .select(`
                    id,
                    agreed_price,
                    condition,
                    user_cards (
                        default_cards (
                            name,
                            image_uris
                        )
                    )
                `)
                .eq('transaction_id', selectedConversation.transaction_id);

            if(itemsError) {
                console.error("Error fetching transaction items:", itemsError);
            } else {
                setTransactionItems(itemsData);
            }
        } else {
            setTransactionItems([]);
        }
    };

    fetchMessagesAndItems();

  }, [selectedConversation]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!selectedConversation || !userId) return;

    const supabase = createClient();

    // Set up real-time subscription for new messages in this conversation
    console.log('Setting up real-time subscription for conversation:', selectedConversation.id);

    const channel = supabase
      .channel(`messages_${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          console.log('New message received via real-time:', payload);
          const newMessage = payload.new as Message;

          // Only add message if it's not from the current user (to avoid duplicates)
          if (newMessage.sender_id !== userId) {
            setMessages(prev => {
              // Check if message already exists to prevent duplicates
              const messageExists = prev.some(msg => msg.id === newMessage.id);
              if (!messageExists) {
                // Add visual feedback for new messages
                if (document.hidden) {
                  // Browser tab is not active, could show notification
                  console.log('New message while tab inactive:', newMessage.content);
                }

                const updatedMessages = [...prev, newMessage].sort((a, b) =>
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );

                return updatedMessages;
              }
              return prev;
            });

            // Mark message as delivered for the sender
            setMessageStatuses(prev => ({ ...prev, [newMessage.id]: 'delivered' }));
          }

          // Update conversation's last_message_at
          setConversations(prev =>
            prev.map(conv =>
              conv.id === selectedConversation.id
                ? { ...conv, last_message_at: newMessage.created_at }
                : conv
            )
          );
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to real-time updates for conversation:', selectedConversation.id);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to real-time updates');
        }
      });

    // Cleanup function
    return () => {
      console.log('Unsubscribing from messages channel');
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, userId]);
  
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !userId) return;

    const supabase = createClient();
    const messageContent = newMessage.trim();
    const tempMessageId = Math.random().toString();

    // Optimistically update UI immediately with sending status
    const optimisticMessage = {
      id: tempMessageId,
      content: messageContent,
      created_at: new Date().toISOString(),
      sender_id: userId
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setMessageStatuses(prev => ({ ...prev, [tempMessageId]: 'sending' }));
    setNewMessage("");

    try {
      // Insert message and update conversation timestamp in a transaction-like approach
      const { data: insertedMessage, error: messageError } = await supabase
        .from('messages')
        .insert({
            conversation_id: selectedConversation.id,
            sender_id: userId,
            content: messageContent,
        })
        .select()
        .single();

      if (messageError || !insertedMessage) {
        console.error("Error sending message:", messageError);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
        setMessageStatuses(prev => {
          const newStatuses = { ...prev };
          delete newStatuses[tempMessageId];
          return newStatuses;
        });
        setNewMessage(messageContent); // Restore message content
        return;
      }

      // Replace optimistic message with real message
      setMessages(prev => prev.map(msg =>
        msg.id === tempMessageId ? insertedMessage : msg
      ));
      setMessageStatuses(prev => ({ ...prev, [insertedMessage.id]: 'sent' }));

      // Update conversation's last_message_at
      const { error: conversationError } = await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConversation.id);

      if (conversationError) {
        console.error("Error updating conversation timestamp:", conversationError);
      }

      // Update local conversation state
      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation.id
            ? { ...conv, last_message_at: new Date().toISOString() }
            : conv
        )
      );

      // Update message status to delivered after a short delay
      setTimeout(() => {
        setMessageStatuses(prev => ({ ...prev, [insertedMessage.id]: 'delivered' }));
      }, 1000);

    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      setMessageStatuses(prev => {
        const newStatuses = { ...prev };
        delete newStatuses[tempMessageId];
        return newStatuses;
      });
      setNewMessage(messageContent); // Restore message content
    }
  };

  return (
    <div className="container py-8">
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Conversations List */}
        <div className="w-80 flex flex-col border rounded-lg">
          <div className="p-4 border-b">
            <h2 className="font-semibold mb-4">Messages</h2>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search messages..." className="pl-8" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
                <div className="p-4 text-center">Loading conversations...</div>
            ) : (
              conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 border-b hover:bg-accent cursor-pointer ${
                  selectedConversation?.id === conversation.id ? "bg-accent" : ""
                }`}
                onClick={() => setSelectedConversation(conversation)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={conversation.other_participant.avatar_url || ""}
                      alt={conversation.other_participant.display_name}
                    />
                    <AvatarFallback>
                      {conversation.other_participant.display_name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{conversation.other_participant.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(conversation.last_message_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.last_message}
                    </p>
                  </div>
                  {conversation.unread_count > 0 && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </div>
              </div>
            ))
            )}
          </div>
        </div>

        {/* Chat Area & Transaction Details */}
        <div className="flex-1 flex flex-col gap-4">
            <div className="flex-1 flex flex-col border rounded-lg">
            {selectedConversation ? (
              <>
                <div className="p-4 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={selectedConversation.other_participant.avatar_url || ""}
                        alt={selectedConversation.other_participant.display_name}
                      />
                      <AvatarFallback>
                        {selectedConversation.other_participant.display_name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold">{selectedConversation.other_participant.display_name}</h2>
                    </div>
                  </div>
                </div>
                
                <div
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_id === userId ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                            message.sender_id === userId
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm break-words">{message.content}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs opacity-70">
                              {new Date(message.created_at).toLocaleTimeString()}
                          </p>
                          {renderMessageStatus(message.id)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t">
                  <form className="flex gap-2" onSubmit={handleSendMessage}>
                    <Input placeholder="Type a message..." className="flex-1" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
                    <Button type="submit" size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-muted-foreground">Select a conversation to start chatting.</p>
              </div>
            )}
            </div>

            {transactionItems.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Items in this Conversation</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible>
                            <AccordionItem value="items">
                                <AccordionTrigger>{transactionItems.length} items</AccordionTrigger>
                                <AccordionContent>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
                                        {transactionItems.map(item => (
                                            <div key={item.id}>
                                                <Image 
                                                    src={item.user_cards.default_cards.image_uris?.art_crop || FALLBACK_CARD_IMAGE} 
                                                    alt={item.user_cards.default_cards.name}
                                                    width={100}
                                                    height={140}
                                                    className="rounded-lg"
                                                />
                                                <p className="text-sm font-medium mt-1">{item.user_cards.default_cards.name}</p>
                                                <p className="text-xs text-muted-foreground">${item.agreed_price.toFixed(2)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>
            )}
        </div>
      </div>
    </div>
  )
} 