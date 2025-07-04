'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Plus } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { CollectionContent } from "@/components/collection/collection-content"
import { CollectionStats } from "@/components/collection/collection-stats"
import { useEffect, useState } from "react"

type ScryfallImageUris = {
  small: string
  normal: string
  large: string
  png: string
  art_crop: string
  border_crop: string
}

type CardDetails = {
  id: string
  name: string
  set_name: string
  image_uris: ScryfallImageUris | null
  prices: {
    usd?: string
    [key: string]: string | undefined
  }
  type_line: string
  rarity: string
}

type UserCard = {
  id: string
  quantity: number
  condition: string
  foil: boolean
  notes: string | null
  is_for_sale: boolean
  sale_price: number | null
  default_cards: CardDetails
}

export default function CollectionPage() {
  const [userCards, setUserCards] = useState<UserCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name")
  const [container, setContainer] = useState("all")

  useEffect(() => {
    fetchUserCards()
  }, [])

  async function fetchUserCards() {
    try {
      const supabase = createClient()
      
      // Get the current user's ID
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("User not authenticated")
        setLoading(false)
        return
      }

      // Fetch user's cards with card details
      const { data: userCards, error } = await supabase
        .from('user_cards')
        .select(`
          id,
          quantity,
          condition,
          foil,
          notes,
          is_for_sale,
          sale_price,
          default_cards (
            id,
            name,
            set_name,
            image_uris,
            prices,
            type_line,
            rarity
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching collection:', error)
        setError('Error loading collection')
      } else {
        // Transform the data to match our expected type
        const transformedCards = (userCards || []).map(card => ({
          ...card,
          default_cards: Array.isArray(card.default_cards) 
            ? card.default_cards[0] 
            : card.default_cards
        })) as UserCard[]
        setUserCards(transformedCards)
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to load collection')
    } finally {
      setLoading(false)
    }
  }

  async function deleteCard(cardId: string) {
    try {
      setLoading(true)
      const supabase = createClient()
      
      const { error } = await supabase
        .from('user_cards')
        .delete()
        .eq('id', cardId)

      if (error) {
        console.error('Error deleting card:', error)
        setError('Failed to delete card')
        return false
      }

      // Update local state
      setUserCards(prev => prev.filter(card => card.id !== cardId))
      return true
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to delete card')
      return false
    } finally {
      setLoading(false)
    }
  }

  async function updateCardStatus(cardId: string, updates: { 
    is_for_sale?: boolean
    sale_price?: number | null 
  }) {
    try {
      setLoading(true)
      const supabase = createClient()
      
      const { error } = await supabase
        .from('user_cards')
        .update(updates)
        .eq('id', cardId)

      if (error) {
        console.error('Error updating card:', error)
        setError('Failed to update card')
        return false
      }

      // Update local state
      setUserCards(prev => prev.map(card => 
        card.id === cardId 
          ? { ...card, ...updates }
          : card
      ))
      return true
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to update card')
      return false
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="container py-8">Loading collection...</div>
  }

  if (error) {
    return <div className="container py-8">Error: {error}</div>
  }

  // Calculate collection statistics
  const totalCards = userCards.reduce((sum, card) => sum + card.quantity, 0)
  const uniqueCards = userCards.length
  const totalValue = userCards.reduce((sum, card) => {
    const cardPrice = parseFloat(card.default_cards.prices.usd || '0')
    return sum + (cardPrice * card.quantity)
  }, 0)
  const averageValue = totalCards > 0 ? totalValue / totalCards : 0

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Collection</h1>
        <div className="flex gap-2">
          <Button>Import Cards</Button>
          <Link href="/collection/add">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Cards
            </Button>
          </Link>
        </div>
      </div>

      <CollectionStats
        totalCards={totalCards}
        uniqueCards={uniqueCards}
        totalValue={totalValue}
        averageValue={averageValue}
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search cards..." 
            className="pl-8" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={container} onValueChange={setContainer}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Container" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cards</SelectItem>
              <SelectItem value="deck1">Main Deck</SelectItem>
              <SelectItem value="binder1">Trade Binder</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="condition">Condition</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <CollectionContent 
        userCards={userCards} 
        searchTerm={searchTerm}
        sortBy={sortBy}
        onDeleteCard={deleteCard}
        onUpdateCardStatus={updateCardStatus}
      />
    </div>
  )
} 