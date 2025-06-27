import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Send } from "lucide-react"

// Mock data for initial development
const mockConversations = [
  {
    id: 1,
    user: "MTGDealer123",
    avatar: "https://placehold.co/40",
    lastMessage: "Would you take $100 for the Jace?",
    timestamp: "2 hours ago",
    unread: true,
  },
  {
    id: 2,
    user: "CardCollector",
    avatar: "https://placehold.co/40",
    lastMessage: "I can meet tomorrow at the card shop",
    timestamp: "1 day ago",
    unread: false,
  },
  // Add more mock conversations as needed
]

const mockMessages = [
  {
    id: 1,
    sender: "MTGDealer123",
    content: "Hi, I'm interested in your Jace, the Mind Sculptor",
    timestamp: "3 hours ago",
    isSender: false,
  },
  {
    id: 2,
    sender: "You",
    content: "Hello! Yes, it's still available. I'm asking $120",
    timestamp: "3 hours ago",
    isSender: true,
  },
  {
    id: 3,
    sender: "MTGDealer123",
    content: "Would you take $100 for the Jace?",
    timestamp: "2 hours ago",
    isSender: false,
  },
  // Add more mock messages as needed
]

export default function MessagesPage() {
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
            {mockConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 border-b hover:bg-accent cursor-pointer ${
                  conversation.id === 1 ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={conversation.avatar}
                    alt={conversation.user}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{conversation.user}</p>
                      <p className="text-xs text-muted-foreground">
                        {conversation.timestamp}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.lastMessage}
                    </p>
                  </div>
                  {conversation.unread && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col border rounded-lg">
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <img
                src="https://placehold.co/40"
                alt="MTGDealer123"
                className="w-10 h-10 rounded-full"
              />
              <div>
                <h2 className="font-semibold">MTGDealer123</h2>
                <p className="text-sm text-muted-foreground">Online</p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {mockMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.isSender ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.isSender
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t">
            <form className="flex gap-2">
              <Input placeholder="Type a message..." className="flex-1" />
              <Button type="submit" size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 