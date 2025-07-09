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
import { UserCard, Container, CardDetails } from '@/lib/types'

interface DatabaseUserCard {
  id: string
  quantity: number
  condition: string
  foil: boolean
  notes: string | null
  is_for_sale: boolean
  sale_price: number | null
  default_cards: {
    id: string
    name: string
    set_name: string
    type_line: string
    oracle_text: string | null
    flavor_text: string | null
    image_uris: string | null
    prices: { usd?: string } | null
    rarity: string
  }
  container_items?: {
    id: string
    container_id: string
    containers: {
      id: string
      name: string
      container_type: string
      is_default: boolean
    }
  }[]
}

export default function CollectionPage() {
  const [userCards, setUserCards] = useState<UserCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("name")
  const [container, setContainer] = useState("all")
  const [availableContainers, setAvailableContainers] = useState<Container[]>([])

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

      // Fetch user's cards with card details and container information
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
            rarity,
            oracle_text,
            flavor_text
          ),
          container_items (
            id,
            container_id,
            containers (
              id,
              name,
              container_type,
              is_default
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching collection:', error)
        setError('Error loading collection')
      } else {
        // Transform the data to match our expected type
        const transformedCards = ((userCards as unknown as DatabaseUserCard[]) || []).map(card => {
          const cardData = Array.isArray(card.default_cards) 
            ? card.default_cards[0] 
            : card.default_cards

          const containerItems = (card.container_items || []).map(item => ({
            id: item.id,
            container_id: item.container_id,
            containers: item.containers && {
              id: item.containers.id,
              name: item.containers.name,
              container_type: item.containers.container_type,
              is_default: item.containers.is_default
            }
          }))

          return {
            id: card.id,
            quantity: card.quantity,
            condition: card.condition,
            foil: card.foil,
            notes: card.notes,
            is_for_sale: card.is_for_sale,
            sale_price: card.sale_price,
            default_cards: {
              id: cardData.id,
              name: cardData.name,
              set_name: cardData.set_name,
              type_line: cardData.type_line,
              oracle_text: cardData.oracle_text || '',
              flavor_text: cardData.flavor_text,
              image_uris: cardData.image_uris,
              prices: cardData.prices || {},
              rarity: cardData.rarity
            },
            container_items: containerItems
          } satisfies UserCard
        })
        setUserCards(transformedCards)

        // Get unique containers for the dropdown
        const allContainers = ((userCards as unknown as DatabaseUserCard[]) || [])
          .flatMap(card => card.container_items || [])
          .map(item => item.containers)
          .filter((container): container is NonNullable<typeof container> => container !== null)
          .map(container => ({
            id: container.id,
            name: container.name,
            container_type: container.container_type,
            is_default: container.is_default
          }))

        const uniqueContainers = Array.from(new Set(allContainers.map(c => c.id)))
          .map(id => allContainers.find(c => c.id === id))
          .filter((c): c is Container => c !== undefined)

        setAvailableContainers(uniqueContainers)
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
  const totalValue = calculateTotalValue(userCards)
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
              {availableContainers.map(container => (
                <SelectItem key={container.id} value={container.id}>
                  {container.name}
                </SelectItem>
              ))}
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
        container={container}
        onDeleteCard={deleteCard}
        onUpdateCardStatus={updateCardStatus}
      />
    </div>
  )
} 

// Update the total value calculation to handle undefined prices
function calculateTotalValue(cards: UserCard[]): number {
  return cards.reduce((total, card) => {
    const price = card.default_cards.prices?.usd
    if (!price) return total
    return total + (parseFloat(price) * card.quantity)
  }, 0)
} 