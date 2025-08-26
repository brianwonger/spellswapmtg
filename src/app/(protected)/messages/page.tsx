'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, FormEvent, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Send, Check, CheckCheck, Clock, CheckCircle, Handshake, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CancelTransactionDialog } from '@/components/cancel-transaction-dialog'

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
  transaction_status?: string | null;
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
            image_uris: string | {
                art_crop?: string;
                normal?: string;
                large?: string;
            };
        };
    };
}

type Transaction = {
    id: string;
    buyer_id: string;
    seller_id: string;
    status: string;
    cancelled_by?: string;
}

const FALLBACK_CARD_IMAGE = "https://cards.scryfall.io/large/front/0/c/0c082aa8-bf7f-47f2-baf8-43ad253fd7d7.jpg"

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([]);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messageStatuses, setMessageStatuses] = useState<Record<string, MessageStatus>>({});
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showSellerCancelDialog, setShowSellerCancelDialog] = useState(false);
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper function to determine user's role in transaction
  const getUserRole = (): string | null => {
    if (!transaction || !userId) return null;
    if (transaction.buyer_id === userId) return 'buyer';
    if (transaction.seller_id === userId) return 'seller';
    return null;
  };

  // Helper function to check if conversation is disabled
  const isConversationDisabled = (): boolean => {
    if (!transaction) return false;
    return transaction.status === 'cancelled' || transaction.status === 'completed';
  };

  // Helper function to check if transaction is accepted
  const isTransactionAccepted = (): boolean => {
    if (!transaction) return false;
    return transaction.status === 'accepted';
  };

  // Helper function to get disabled conversation message
  const getDisabledMessage = (): string => {
    if (!transaction) return '';
    if (transaction.status === 'cancelled') {
      const cancelledByRole = transaction.cancelled_by === transaction.buyer_id ? 'buyer' : 'seller';
      return `This conversation is disabled because the transaction was cancelled by the ${cancelledByRole}.`;
    }
    if (transaction.status === 'completed') {
      return 'This conversation is disabled because the transaction was completed.';
    }
    if (transaction.status === 'accepted') {
      return 'Messaging is still enabled. Please coordinate with the other party to complete the transaction.';
    }
    if (transaction.status === 'pending') {
      const userRole = getUserRole();
      if (userRole === 'seller') {
        return 'Review the transaction details above and click "Accept Transaction" when ready.';
      }
      if (userRole === 'buyer') {
        return 'Waiting for the seller to accept the transaction. You can continue messaging.';
      }
    }
    return '';
  };

  // Function to mark transaction as complete
  const markTransactionComplete = async () => {
    if (!transaction || !selectedConversation) return;

    try {
      const response = await fetch('/api/transactions/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: transaction.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error marking transaction as complete:', errorData.error);
        alert(`Error: ${errorData.error}`);
        return;
      }

      const result = await response.json();
      console.log('Transaction marked as complete:', result);

      // Update local transaction state
      setTransaction(prev => prev ? { ...prev, status: 'completed' } : null);

      // Update conversation status
      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation.id
            ? { ...conv, transaction_status: 'completed' }
            : conv
        )
      );

      alert('Transaction marked as complete! Payment will be transferred once the payment feature is implemented.');

    } catch (error) {
      console.error('Error in markTransactionComplete:', error);
      alert('An error occurred while marking the transaction as complete.');
    }
  };

  // Function to accept transaction (for sellers)
  const acceptTransaction = async () => {
    if (!transaction || !selectedConversation) return;

    try {
      const response = await fetch('/api/transactions/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: transaction.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error accepting transaction:', errorData.error);
        alert(`Error: ${errorData.error}`);
        return;
      }

      const result = await response.json();
      console.log('Transaction accepted:', result);

      // Update local transaction state
      setTransaction(prev => prev ? { ...prev, status: 'accepted' } : null);

      // Update conversation status
      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation.id
            ? { ...conv, transaction_status: 'accepted' }
            : conv
        )
      );

      alert('Transaction accepted! You can now coordinate with the buyer to complete the exchange.');

    } catch (error) {
      console.error('Error in acceptTransaction:', error);
      alert('An error occurred while accepting the transaction.');
    }
  };

  // Function to cancel transaction (for buyers)
  const cancelTransaction = async (reason: string) => {
    if (!transaction || !selectedConversation) return;

    try {
      const response = await fetch('/api/transactions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: transaction.id,
          reason: reason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel transaction');
      }

      const result = await response.json();
      console.log('Transaction cancelled:', result);

      // Update local transaction state
      setTransaction(prev => prev ? { ...prev, status: 'cancelled' } : null);

      // Update conversation status
      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation.id
            ? { ...conv, transaction_status: 'cancelled' }
            : conv
        )
      );

      const userRole = getUserRole();
      const notificationTarget = userRole === 'buyer' ? 'seller' : 'buyer';
      alert(`Transaction cancelled successfully. The ${notificationTarget} has been notified.`);

    } catch (error) {
      console.error('Error in cancelTransaction:', error);
      throw error;
    }
  };

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
          participant2:profiles!conversations_participant2_id_fkey(id, display_name, avatar_url),
          transaction:transactions!conversations_transaction_id_fkey(status)
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
              transaction_status: conv.transaction?.status || null,
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

  // Function to mark messages as read
  const markMessagesAsRead = async (conversationId: string, markAll: boolean = true, messageIds?: string[]) => {
    try {
      const response = await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          messageIds,
          markAll,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark messages as read');
      }

      const result = await response.json();
      console.log('Messages marked as read:', result);

      // Update local message state to reflect read status
      if (markAll) {
        setMessages(prev => prev.map(msg =>
          msg.sender_id !== userId ? { ...msg, is_read: true } : msg
        ));
      } else if (messageIds) {
        setMessages(prev => prev.map(msg =>
          messageIds.includes(msg.id) ? { ...msg, is_read: true } : msg
        ));
      }

      // Update conversation unread count
      setConversations(prev => prev.map(conv =>
        conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
      ));

    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

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

            // Mark messages as read when conversation is opened
            if (userId && messagesData.length > 0) {
              // Find unread messages from other users
              const unreadMessageIds = messagesData
                .filter(msg => msg.sender_id !== userId && !msg.is_read)
                .map(msg => msg.id);

              if (unreadMessageIds.length > 0) {
                setTimeout(() => {
                  markMessagesAsRead(selectedConversation.id, false, unreadMessageIds);
                }, 1000); // Small delay to ensure UI is rendered
              }
            }
        }

        // Fetch transaction and transaction items
        if (selectedConversation.transaction_id) {
            // Fetch transaction data
            const { data: transactionData, error: transactionError } = await supabase
                .from('transactions')
                .select('id, buyer_id, seller_id, status, cancelled_by')
                .eq('id', selectedConversation.transaction_id)
                .single();

            if (transactionError) {
                console.error("Error fetching transaction:", transactionError);
                setTransaction(null);
            } else {
                setTransaction(transactionData);
            }

            // Fetch transaction items
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
                console.log("Transaction items data:", itemsData);
                setTransactionItems(itemsData);
            }
        } else {
            setTransaction(null);
            setTransactionItems([]);
        }
    };

    fetchMessagesAndItems();

  }, [selectedConversation, userId]);

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

            // Mark the new message as read since user is actively viewing the conversation
            if (selectedConversation && newMessage.conversation_id === selectedConversation.id) {
              setTimeout(() => {
                markMessagesAsRead(selectedConversation.id, false, [newMessage.id]);
              }, 500); // Small delay to ensure message is in the UI
            }
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

    // Prevent sending messages if conversation is disabled
    if (isConversationDisabled()) return;

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
              conversations.map((conversation) => {
                // Check if this conversation has a disabled transaction
                const isDisabled = conversation.transaction_id && conversation.transaction_status &&
                  (conversation.transaction_status === 'cancelled' || conversation.transaction_status === 'completed');

                // Get display status for transaction
                const getTransactionDisplayStatus = (status: string | null) => {
                  switch (status) {
                    case 'accepted': return 'Accepted - Ready for Pickup';
                    case 'cancelled': return 'Transaction Cancelled';
                    case 'completed': return 'Transaction Completed';
                    case 'pending': return 'Pending';
                    default: return status?.charAt(0).toUpperCase() + status?.slice(1);
                  }
                };

                return (
                  <div
                    key={conversation.id}
                    className={`p-4 border-b hover:bg-accent cursor-pointer ${
                      selectedConversation?.id === conversation.id ? "bg-accent" : ""
                    } ${isDisabled ? "opacity-60 bg-gray-50" : ""}`}
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
                    {conversation.transaction_status && (
                      <div className="mt-1">
                        <span className={`text-xs font-medium ${
                          conversation.transaction_status === 'cancelled'
                            ? 'text-red-500'
                            : conversation.transaction_status === 'completed'
                            ? 'text-green-500'
                            : conversation.transaction_status === 'accepted'
                            ? 'text-orange-500'
                            : 'text-blue-500'
                        }`}>
                          {getTransactionDisplayStatus(conversation.transaction_status)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
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
                  className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96"
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
                  {isConversationDisabled() ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-2">{getDisabledMessage()}</p>
                      <div className="flex gap-2 justify-center">
                        <Input
                          placeholder="Messaging is disabled for this conversation..."
                          className="flex-1 opacity-50 cursor-not-allowed"
                          disabled
                        />
                        <Button type="button" size="icon" disabled>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {transaction?.status === 'pending' && (
                        <div className="text-center py-2">
                          {getUserRole() === 'seller' ? (
                            <div>
                              <p className="text-sm text-blue-600 font-medium">
                                Review the transaction and click "Accept Transaction" when ready.
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Accepting will lock the cart and allow you to coordinate the exchange.
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-yellow-600 font-medium">
                                Waiting for seller to accept the transaction.
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                You can continue messaging while waiting.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      {isTransactionAccepted() && (
                        <div className="text-center py-2">
                          <p className="text-sm text-orange-600 font-medium">
                            Transaction accepted! Coordinate with the other party to complete the exchange.
                          </p>
                          {getUserRole() === 'buyer' && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Once you receive the items, click "Mark as Complete" above to finish the transaction.
                            </p>
                          )}
                        </div>
                      )}
                      <form className="flex gap-2" onSubmit={handleSendMessage}>
                        <Input
                          placeholder="Type a message..."
                          className="flex-1"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <Button type="submit" size="icon">
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-muted-foreground">Select a conversation to start chatting.</p>
              </div>
            )}
            </div>

            {transactionItems.length > 0 && (
                <Card className={isConversationDisabled() ? "opacity-75" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CardTitle>Items in this Conversation</CardTitle>
                            {transaction && (
                                <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                                    transaction.status === 'cancelled'
                                        ? 'bg-red-100 text-red-800'
                                        : transaction.status === 'completed'
                                        ? 'bg-green-100 text-green-800'
                                        : transaction.status === 'accepted'
                                        ? 'bg-orange-100 text-orange-800'
                                        : transaction.status === 'pending'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-muted text-muted-foreground'
                                }`}>
                                    {transaction.status === 'accepted'
                                        ? 'Accepted - Ready for Pickup'
                                        : transaction.status === 'cancelled'
                                        ? 'Transaction Cancelled'
                                        : transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)
                                    }
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {getUserRole() && (
                                <div className="text-sm font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground">
                                    {getUserRole() === 'buyer' ? 'You are the buyer' : 'You are the seller'}
                                </div>
                            )}
                            {getUserRole() === 'seller' && transaction?.status === 'pending' && (
                                <div className="flex flex-col gap-2">
                                    <Button
                                        onClick={acceptTransaction}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        <Handshake className="h-4 w-4 mr-1" />
                                        Accept Transaction
                                    </Button>
                                    <Button
                                        onClick={() => setShowSellerCancelDialog(true)}
                                        size="sm"
                                        variant="destructive"
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        Cancel Transaction
                                    </Button>
                                </div>
                            )}
                            {isTransactionAccepted() && getUserRole() === 'buyer' && (
                                <div className="flex gap-2">
                                    <Button
                                        onClick={markTransactionComplete}
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Mark as Complete
                                    </Button>
                                    <Button
                                        onClick={() => setShowCancelDialog(true)}
                                        size="sm"
                                        variant="destructive"
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        Cancel Transaction
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible>
                            <AccordionItem value="items">
                                <AccordionTrigger>{transactionItems.length} items</AccordionTrigger>
                                <AccordionContent>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4">
                                                                                 {transactionItems.map(item => {
                                            const defaultCard = item.user_cards.default_cards;
                                            
                                            // Parse image_uris if it's a string
                                            let imageUris;
                                            try {
                                                imageUris = typeof defaultCard.image_uris === 'string'
                                                    ? JSON.parse(defaultCard.image_uris)
                                                    : defaultCard.image_uris;
                                            } catch (e) {
                                                console.error('Error parsing image_uris:', e);
                                                imageUris = null;
                                            }

                                            const imageUrl = imageUris?.normal || imageUris?.large || FALLBACK_CARD_IMAGE;

                                            return (
                                                <div key={item.id}>
                                                    <Image
                                                        src={imageUrl}
                                                        alt={defaultCard.name}
                                                        width={100}
                                                        height={140}
                                                        className="rounded-lg"
                                                    />
                                                    <p className="text-sm font-medium mt-1">{defaultCard.name}</p>
                                                    <p className="text-xs text-muted-foreground">${item.agreed_price.toFixed(2)}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>
            )}
        </div>
      </div>

      {/* Cancel Transaction Dialog for Buyers */}
      <CancelTransactionDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={cancelTransaction}
        transactionId={transaction?.id || ''}
        description="Are you sure you want to cancel this transaction? The seller will be notified."
      />

      {/* Cancel Transaction Dialog for Sellers */}
      <CancelTransactionDialog
        open={showSellerCancelDialog}
        onOpenChange={setShowSellerCancelDialog}
        onConfirm={cancelTransaction}
        transactionId={transaction?.id || ''}
        description="Are you sure you want to cancel this transaction? The buyer will be notified."
      />
    </div>
  )
} 