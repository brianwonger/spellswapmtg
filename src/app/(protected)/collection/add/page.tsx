'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ArrowLeft, Minus, Plus } from "lucide-react"
import Link from "next/link"
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
  image_uri?: string
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

const CONDITION_LABELS: Record<typeof CONDITIONS[number], string> = {
  mint: "Mint",
  near_mint: "Near Mint",
  excellent: "Excellent",
  good: "Good",
  light_played: "Lightly Played",
  played: "Played",
  poor: "Poor"
}

export default function AddCardsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Card[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [condition, setCondition] = useState<typeof CONDITIONS[number]>("near_mint")
  const supabase = createClient()

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('default_cards')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,type_line.ilike.%${searchQuery}%,oracle_text.ilike.%${searchQuery}%,flavor_text.ilike.%${searchQuery}%`)
        .limit(20)

      if (error) throw error
      setSearchResults(data || [])
    } catch (error) {
      console.error('Error searching cards:', error)
      toast.error('Failed to search cards')
    } finally {
      setIsLoading(false)
    }
  }

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

      // Add the card to the user's collection
      const { error: insertError } = await supabase
        .from('user_cards')
        .insert([
          {
            card_id: selectedCard.id,
            user_id: user.id,
            container_id: containerId,
            quantity,
            condition,
            foil: false, // Default to non-foil
            language: 'english' // Default language
          }
        ])

      if (insertError) throw insertError
      
      toast.success(`Added ${quantity}x ${selectedCard.name} to collection`)
      setSelectedCard(null)
    } catch (error) {
      console.error('Error adding card to collection:', error)
      toast.error('Failed to add card to collection')
    }
  }

  return (
    <>
      <div className="container py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/collection">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Add Cards to Collection</h1>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cards by name, type, oracle text, or flavor text..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {searchResults.map((card) => (
            <Card key={card.id} className="overflow-hidden">
              {card.image_uri && (
                <div className="aspect-[3/4] relative">
                  <img
                    src={card.image_uri}
                    alt={card.name}
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
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