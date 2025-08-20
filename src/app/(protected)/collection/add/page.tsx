'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ArrowLeft, Minus, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Toaster, toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Card {
  id: string
  name: string
  type_line: string
  oracle_text: string
  flavor_text?: string
  image_uris: string | null
  set_name: string
}

// Match the condition values from the database schema
const CONDITIONS = [
  "mint",
  "near_mint",
  "excellent",
  "good",
  "light_played",
  "played",
  "poor"
] as const

const ITEMS_PER_PAGE = 20

const CONDITION_LABELS: Record<typeof CONDITIONS[number], string> = {
  mint: "Mint",
  near_mint: "Near Mint",
  excellent: "Excellent",
  good: "Good",
  light_played: "Lightly Played",
  played: "Played",
  poor: "Poor"
}

const getCardImageUrl = (imageUris: string | null | undefined): string => {
  if (!imageUris) return 'https://placehold.co/488x680/374151/e5e7eb?text=No+Image'
  
  try {
    // Parse the JSON string
    const uris = JSON.parse(imageUris)
    
    // Add defensive check for null uris after parsing
    if (!uris) return 'https://placehold.co/488x680/374151/e5e7eb?text=No+Image'
    
    return uris.normal || 
           uris.large || 
           uris.small || 
           'https://placehold.co/488x680/374151/e5e7eb?text=No+Image'
  } catch (error) {
    console.error('Error parsing image URIs:', error, 'Raw value:', imageUris)
    return 'https://placehold.co/488x680/374151/e5e7eb?text=No+Image'
  }
}

export default function AddCardsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Card[]>([])
  const [totalResults, setTotalResults] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [condition, setCondition] = useState<typeof CONDITIONS[number]>("near_mint")
  const supabase = createClient()

  const handleSearch = async (page = 1) => {
    if (!searchQuery.trim()) return

    const cleanedQuery = searchQuery.trim().split(/\s+/).join(' & ')

    setIsLoading(true)
    try {
      // First get the total count
      const { count, error: countError } = await supabase
        .from('default_cards')
        .select('id', { count: 'exact', head: true })
        .textSearch('fts', cleanedQuery)

      if (countError) throw countError

      // Then get the paginated results
      const { data, error } = await supabase
        .from('default_cards')
        .select('id, name, type_line, oracle_text, flavor_text, image_uris, set_name')
        .textSearch('fts', cleanedQuery)
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1)

      if (error) throw error
      
      setSearchResults(data || [])
      setTotalResults(count || 0)
      setCurrentPage(page)
    } catch (error) {
      console.error('Error searching cards:', error)
      let errorMessage = 'Failed to search cards'
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`
      } else if (typeof error === 'object' && error !== null) {
        const err = error as { code?: string; message?: string; details?: string }
        if (err.message) {
          errorMessage += `: ${err.message}`
        }
      }
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    handleSearch(newPage)
  }

  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE)
  const startRange = ((currentPage - 1) * ITEMS_PER_PAGE) + 1
  const endRange = Math.min(currentPage * ITEMS_PER_PAGE, totalResults)

  const openAddModal = (card: Card) => {
    setSelectedCard(card)
    setQuantity(1)
    setCondition("near_mint")
  }

  const handleQuantityChange = (change: number) => {
    setQuantity(prev => Math.max(1, prev + change))
  }

  const addToCollection = async () => {
    if (!selectedCard) return

    try {
      // Get the user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) {
        toast.error('You must be logged in to add cards')
        return
      }

      // Get or create default container
      const { data: containers, error: containerError } = await supabase
        .from('containers')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single()

      if (containerError && containerError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw containerError
      }

      let containerId = containers?.id

      // If no default container exists, create one
      if (!containerId) {
        const { data: newContainer, error: createError } = await supabase
          .from('containers')
          .insert([{
            user_id: user.id,
            name: 'Unorganized Cards',
            container_type: 'custom',
            is_default: true
          }])
          .select('id')
          .single()

        if (createError) throw createError
        containerId = newContainer.id
      }

      // First, add the card to user_cards
      const { data: userCard, error: insertError } = await supabase
        .from('user_cards')
        .insert([
          {
            card_id: selectedCard.id,
            user_id: user.id,
            quantity,
            condition,
            foil: false, // Default to non-foil
            language: 'english' // Default language
          }
        ])
        .select('id')
        .single()

      if (insertError) throw insertError

      // Then, create the container_items entry
      const { error: containerItemError } = await supabase
        .from('container_items')
        .insert([
          {
            user_card_id: userCard.id,
            container_id: containerId,
            quantity: quantity
          }
        ])

      if (containerItemError) throw containerItemError

      // Record the activity
      try {
        const activityMetadata = {
          card_id: selectedCard.id,
          card_name: selectedCard.name,
          quantity,
          condition,
          container_id: containerId
        }

        // Validate metadata before inserting
        const validMetadata = Object.entries(activityMetadata).reduce((acc, [key, value]) => {
          if (value !== null && value !== undefined) {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, unknown>);

        const { error: activityError } = await supabase
          .from('user_activities')
          .insert([
            {
              user_id: user.id,
              activity_type: 'card_added',
              description: `Added ${quantity}x ${selectedCard.name} to collection`,
              metadata: Object.keys(validMetadata).length > 0 ? validMetadata : null
            }
          ])

        if (activityError) {
          // Log the error with more context
          console.error('Error recording activity:', {
            error: activityError,
            metadata: validMetadata,
            userId: user.id,
            cardName: selectedCard.name
          })
          // Show a warning toast but don't block the success message
          toast.warning('Card added but failed to record activity')
        }
      } catch (activityError) {
        // Handle any unexpected errors in activity recording
        console.error('Unexpected error recording activity:', activityError)
        toast.warning('Card added but failed to record activity')
      }
      
      toast.success(`Added ${quantity}x ${selectedCard.name} to collection`)
      setSelectedCard(null)
    } catch (error) {
      console.error('Error adding card to collection:', error)
      let errorMessage = 'Failed to add card to collection'
      
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`
      } else if (typeof error === 'object' && error !== null) {
        // Handle Supabase error object which might have code and message properties
        const err = error as { code?: string; message?: string; details?: string }
        
        // Check for unique constraint violation
        if (err.code === '23505') { // PostgreSQL unique violation code
          errorMessage = `You already have this card in your collection with the same condition (${condition}). Try updating the existing entry instead.`
        } else {
          if (err.message) {
            errorMessage += `: ${err.message}`
          }
          if (err.code) {
            errorMessage += ` (Code: ${err.code})`
          }
          if (err.details) {
            errorMessage += ` - ${err.details}`
          }
        }
      }
      
      toast.error(errorMessage)
    }
  }

  return (
    <>
      <div className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/collection">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Add Cards to Collection</h1>
          </div>
          <Link href="/collection/import">
            <Button>Import</Button>
          </Link>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cards by name, type, oracle text, or flavor text..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(1)}
            />
          </div>
          <Button onClick={() => handleSearch(1)} disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {searchResults.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Showing cards {startRange}-{endRange} out of {totalResults} results
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {searchResults.map((card) => (
            <Card key={card.id} className="overflow-hidden">
              <div className="aspect-[3/4] relative">
                <Image
                  src={getCardImageUrl(card.image_uris)}
                  alt={card.name}
                  fill
                  className="object-cover"
                />
              </div>
              <CardHeader>
                <CardTitle className="text-lg">{card.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  <div className="text-sm text-muted-foreground">
                    {card.set_name} • {card.type_line}
                  </div>
                  <p className="text-sm line-clamp-3">{card.oracle_text}</p>
                  <Button onClick={() => openAddModal(card)}>
                    Add to Collection
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {searchResults.length > 0 && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Dialog open={!!selectedCard} onOpenChange={(open: boolean) => !open && setSelectedCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {selectedCard?.name} to Collection</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center"
                  min="1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Condition</label>
              <Select value={condition} onValueChange={(value) => setCondition(value as typeof CONDITIONS[number])}>
                <SelectTrigger>
                  <SelectValue>
                    {CONDITION_LABELS[condition]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((cond) => (
                    <SelectItem key={cond} value={cond}>
                      {CONDITION_LABELS[cond]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCard(null)}>
              Cancel
            </Button>
            <Button onClick={addToCollection}>
              Add to Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </>
  )
} 