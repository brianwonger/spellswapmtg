'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Plus, ArrowUpDown, Package } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { CollectionContent } from "@/components/collection/collection-content"
import { CollectionStats } from "@/components/collection/collection-stats"
import { useEffect, useState } from "react"
import { UserCard, Container, CardDetails } from '@/lib/types'
import { FilterDialog, CardFilters } from "@/components/collection/filter-dialog"

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
    quantity: number
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
  const [filters, setFilters] = useState<CardFilters>({
    colors: [],
    type: null,
    rarity: null,
    set: null,
    minPrice: null,
    maxPrice: null,
    condition: null,
    foil: null
  })

  useEffect(() => {
    async function fetchData() {
      await fetchUserCards()
      await fetchContainers()
    }
    fetchData()
  }, [])

  async function fetchContainers() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: containers, error } = await supabase
        .from('containers')
        .select('*')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching containers:', error)
      } else {
        setAvailableContainers(containers || [])
      }
    } catch (err) {
      console.error("Error fetching containers:", err)
    }
  }

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
            quantity,
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
            quantity: item.quantity,
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

        // No longer need to derive containers from cards
        // const allContainers = ((userCards as unknown as DatabaseUserCard[]) || [])
        //   .flatMap(card => card.container_items || [])
        //   .map(item => item.containers)
        //   .filter((container): container is NonNullable<typeof container> => container !== null)
        //   .map(container => ({
        //     id: container.id,
        //     name: container.name,
        //     container_type: container.container_type,
        //     is_default: container.is_default
        //   }))

        // const uniqueContainers = Array.from(new Set(allContainers.map(c => c.id)))
        //   .map(id => allContainers.find(c => c.id === id))
        //   .filter((c): c is Container => c !== undefined)

        // setAvailableContainers(uniqueContainers)
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

  async function updateCard(cardId: string, updates: {
    quantity: number
    condition: string
    foil: boolean
    notes: string | null
    is_for_sale: boolean
    sale_price: number | null
  }) {
    try {
      setLoading(true)
      const supabase = createClient()

      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) {
        setError('You must be logged in to update cards')
        return false
      }

      // Get the card details for the activity log
      const { data: cardData } = await supabase
        .from('user_cards')
        .select(`
          default_cards (
            name
          )
        `)
        .eq('id', cardId)
        .single() as { data: { default_cards: { name: string } } | null }
      
      const { error } = await supabase
        .from('user_cards')
        .update(updates)
        .eq('id', cardId)

      if (error) {
        console.error('Error updating card:', error)
        setError('Failed to update card')
        return false
      }

      // Record the activity
      const activityDescription = []
      if (updates.quantity) activityDescription.push(`quantity to ${updates.quantity}`)
      if (updates.condition) activityDescription.push(`condition to ${updates.condition}`)
      if (updates.is_for_sale) activityDescription.push(`listed for sale at $${updates.sale_price}`)
      else if (updates.is_for_sale === false) activityDescription.push('removed from sale')

      const { error: activityError } = await supabase
        .from('user_activities')
        .insert([
          {
            user_id: user.id,
            activity_type: updates.is_for_sale ? 'card_listed' : 'card_updated',
            description: `Updated ${cardData?.default_cards?.name}: ${activityDescription.join(', ')}`,
            metadata: {
              card_id: cardId,
              card_name: cardData?.default_cards?.name,
              updates
            }
          }
        ])

      if (activityError) {
        console.error('Error recording activity:', activityError)
        // Don't throw here as the main operation succeeded
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

  async function updateCardContainerItems(userCardId: string, updates: { container_id: string; quantity: number }[]) {
    try {
      const supabase = createClient()
      
      // Get current assignments
      const { data: existingItems, error: fetchError } = await supabase
        .from('container_items')
        .select('id, container_id')
        .eq('user_card_id', userCardId)

      if (fetchError) {
        console.error('Error fetching existing container items:', fetchError)
        setError('Failed to update container assignments')
        return false
      }

      const upsertPromises = updates.map(update => {
        const existing = existingItems?.find(item => item.container_id === update.container_id)
        if (existing) {
          // Update
          return supabase.from('container_items').update({ quantity: update.quantity }).eq('id', existing.id)
        } else {
          // Insert
          return supabase.from('container_items').insert({
            user_card_id: userCardId,
            container_id: update.container_id,
            quantity: update.quantity
          })
        }
      })
      
      const deleteIds = existingItems
        ?.filter(item => !updates.some(u => u.container_id === item.container_id))
        .map(item => item.id)

      const deletePromises = (deleteIds || []).map(id => 
        supabase.from('container_items').delete().eq('id', id)
      )

      const results = await Promise.all([...upsertPromises, ...deletePromises])
      const anyErrors = results.some(res => res.error)

      if (anyErrors) {
        results.forEach(res => {
          if (res.error) console.error('Error in container item update:', res.error)
        })
        setError('An error occurred while updating container assignments.')
        return false
      }
      
      // Refresh card data to show new assignments
      await fetchUserCards()
      return true

    } catch(err) {
      console.error('Error updating container items:', err)
      setError('Failed to update container assignments')
      return false
    }
  }

  if (loading) {
    return <div className="container py-8">Loading collection...</div>
  }

  if (error) {
    return <div className="container py-8 text-red-500">Error: {error}</div>
  }

  // Calculate collection statistics
  const totalCards = userCards.reduce((sum, card) => sum + card.quantity, 0)
  const uniqueCards = userCards.length
  const totalValue = calculateTotalValue(userCards)
  const averageValue = uniqueCards > 0 ? totalValue / uniqueCards : 0

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">My Collection</h1>
            <div className="flex gap-2">
              <Link href="/collection/containers">
                <Button variant="outline">
                  Manage Containers
                </Button>
              </Link>
              <Link href="/collection/add">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Cards
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <CollectionStats
          totalCards={totalCards}
          uniqueCards={uniqueCards}
          totalValue={totalValue}
          averageValue={averageValue}
        />
        <div className="flex flex-col gap-4 pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="search"
                placeholder="Search cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" aria-label="Sort" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sort-by" className="w-[180px]">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="condition">Condition</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" aria-label="Filter by container" />
              <Select value={container} onValueChange={setContainer}>
                <SelectTrigger id="container-filter" className="w-[180px]">
                  <SelectValue placeholder="Container..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Containers</SelectItem>
                  {availableContainers.map(container => (
                    <SelectItem key={container.id} value={container.id}>
                      {container.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FilterDialog filters={filters} onFiltersChange={setFilters} />
            </div>
          </div>
          <CollectionContent
            userCards={userCards}
            searchTerm={searchTerm}
            sortBy={sortBy}
            container={container}
            onDeleteCard={deleteCard}
            onUpdateCardStatus={updateCardStatus}
            onUpdateCard={updateCard}
            availableContainers={availableContainers}
            onUpdateContainerItems={updateCardContainerItems}
            filters={filters}
          />
        </div>
      </main>
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