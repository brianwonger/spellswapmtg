'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { ViewMode, ViewToggle } from "../ui/view-toggle"
import { FilterDialog, CardFilters } from "./filter-dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

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

interface CollectionContentProps {
  userCards: UserCard[]
  searchTerm?: string
  sortBy?: string
  onDeleteCard: (cardId: string) => Promise<boolean>
  onUpdateCardStatus: (cardId: string, updates: { 
    is_for_sale?: boolean
    sale_price?: number | null 
  }) => Promise<boolean>
}

const getCardImageUrl = (imageUris: any): string => {
  if (!imageUris) return 'https://placehold.co/488x680/374151/e5e7eb?text=No+Image'
  
  // Parse the JSONB data if it's a string
  const uris = typeof imageUris === 'string' ? JSON.parse(imageUris) : imageUris
  
  return uris.normal || 
         uris.large || 
         uris.small || 
         'https://placehold.co/488x680/374151/e5e7eb?text=No+Image'
}

export function CollectionContent({ 
  userCards, 
  searchTerm = "", 
  sortBy = "name", 
  onDeleteCard,
  onUpdateCardStatus 
}: CollectionContentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceInput, setPriceInput] = useState<string>("")
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

  // Apply search filtering
  const searchFilteredCards = userCards.filter(card => {
    if (!searchTerm.trim()) return true
    
    const searchLower = searchTerm.toLowerCase()
    const cardName = card.default_cards.name.toLowerCase()
    const setName = card.default_cards.set_name.toLowerCase()
    const typeLine = card.default_cards.type_line.toLowerCase()
    
    return cardName.includes(searchLower) || 
           setName.includes(searchLower) || 
           typeLine.includes(searchLower)
  })

  // Apply additional filters
  const filteredCards = searchFilteredCards.filter(card => {
    // Apply each filter if it's set
    if (filters.type && !card.default_cards.type_line.toLowerCase().includes(filters.type.toLowerCase())) {
      return false
    }

    if (filters.rarity && card.default_cards.rarity !== filters.rarity) {
      return false
    }

    if (filters.condition && card.condition !== filters.condition) {
      return false
    }

    const price = card.is_for_sale ? (card.sale_price ?? 0) : (Number(card.default_cards.prices?.usd) || 0)
    if (filters.minPrice !== null && price < filters.minPrice) {
      return false
    }
    if (filters.maxPrice !== null && price > filters.maxPrice) {
      return false
    }

    if (filters.foil !== null && card.foil !== filters.foil) {
      return false
    }

    return true
  })

  // Apply sorting
  const sortedCards = [...filteredCards].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.default_cards.name.localeCompare(b.default_cards.name)
      case 'price':
        const priceA = a.is_for_sale ? (a.sale_price ?? 0) : (Number(a.default_cards.prices?.usd) || 0)
        const priceB = b.is_for_sale ? (b.sale_price ?? 0) : (Number(b.default_cards.prices?.usd) || 0)
        return priceB - priceA // Descending order
      case 'condition':
        const conditionOrder = { 'mint': 5, 'near_mint': 4, 'excellent': 3, 'good': 2, 'light_played': 1, 'moderately_played': 0, 'heavily_played': -1, 'damaged': -2 }
        return (conditionOrder[b.condition as keyof typeof conditionOrder] || 0) - (conditionOrder[a.condition as keyof typeof conditionOrder] || 0)
      default:
        return 0
    }
  })

  const handleSalePriceUpdate = async (cardId: string) => {
    const price = parseFloat(priceInput)
    if (isNaN(price) || price < 0) return
    
    await onUpdateCardStatus(cardId, { 
      sale_price: price,
      is_for_sale: true
    })
    setEditingPrice(null)
    setPriceInput("")
  }

  const GridView = () => (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sortedCards?.map((card) => {
        const cardDetails = card.default_cards
        const imageUrl = getCardImageUrl(cardDetails.image_uris)
        const price = card.is_for_sale ? (card.sale_price ?? 0) : (Number(cardDetails.prices?.usd) || 0)

        return (
          <Card key={card.id} className="overflow-hidden">
            <div className="aspect-[3/4] relative p-2 bg-muted/10">
              <img
                src={imageUrl}
                alt={cardDetails.name}
                className="object-cover w-full h-full rounded-sm"
                loading="lazy"
              />
              {card.is_for_sale && (
                <div className="absolute top-0 left-0 bg-green-500/80 text-white px-3 py-1 rounded-br-lg font-medium">
                  For Sale
                </div>
              )}
              <button
                onClick={async () => {
                  if (window.confirm('Are you sure you want to remove this card from your collection?')) {
                    await onDeleteCard(card.id)
                  }
                }}
                className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                title="Remove card"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </button>
            </div>
            <CardHeader>
              <CardTitle className="text-lg">{cardDetails.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-1">
                <div className="text-sm text-muted-foreground">
                  {cardDetails.set_name} • {card.condition.replace('_', ' ')}
                  {card.foil && ' • Foil'}
                  {card.quantity > 1 && ` • Qty: ${card.quantity}`}
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-muted-foreground">Market Price:</span>
                    <span className="font-medium">${Number(cardDetails.prices?.usd || 0).toLocaleString()}</span>
                  </div>
                  {card.is_for_sale && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-muted-foreground">Sale Price:</span>
                      <span className="font-medium text-green-600">${(card.sale_price || 0).toLocaleString()}</span>
                    </div>
                  )}
                  {editingPrice === card.id ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="number"
                        value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value)}
                        className="w-24"
                        min="0"
                        step="0.01"
                      />
                      <Button size="sm" onClick={() => handleSalePriceUpdate(card.id)}>Set</Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setEditingPrice(null)
                        setPriceInput("")
                      }}>Cancel</Button>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      variant={card.is_for_sale ? "default" : "outline"}
                      className="mt-2"
                      onClick={() => {
                        if (card.is_for_sale) {
                          onUpdateCardStatus(card.id, { is_for_sale: false, sale_price: null })
                        } else {
                          setEditingPrice(card.id)
                          setPriceInput(Number(cardDetails.prices?.usd || 0).toString())
                        }
                      }}
                    >
                      {card.is_for_sale ? "Remove from Sale" : "Mark for Sale"}
                    </Button>
                  )}
                </div>
                {card.notes && (
                  <div className="text-sm text-muted-foreground mt-2">
                    {card.notes}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )

  const ListView = () => (
    <div className="space-y-4">
      {sortedCards?.map((card) => {
        const cardDetails = card.default_cards
        const imageUrl = getCardImageUrl(cardDetails.image_uris)
        const price = card.is_for_sale ? (card.sale_price ?? 0) : (Number(cardDetails.prices?.usd) || 0)

        return (
          <Card key={card.id}>
            <div className="flex p-4 gap-4">
              <div className="w-[100px] flex-shrink-0 relative">
                <img
                  src={imageUrl}
                  alt={cardDetails.name}
                  className="w-full h-auto rounded"
                  loading="lazy"
                />
                {card.is_for_sale && (
                  <div className="absolute top-0 left-0 bg-green-500/80 text-white px-3 py-1 rounded-br-lg font-medium">
                    For Sale
                  </div>
                )}
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to remove this card from your collection?')) {
                      await onDeleteCard(card.id)
                    }
                  }}
                  className="absolute top-1 right-1 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full"
                  title="Remove card"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{cardDetails.name}</h3>
                <div className="text-sm text-muted-foreground mt-1">
                  {cardDetails.set_name} • {card.condition.replace('_', ' ')}
                  {card.foil && ' • Foil'}
                  {card.quantity > 1 && ` • Qty: ${card.quantity}`}
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-muted-foreground">Market Price:</span>
                    <span className="font-medium">${Number(cardDetails.prices?.usd || 0).toLocaleString()}</span>
                  </div>
                  {card.is_for_sale && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-muted-foreground">Sale Price:</span>
                      <span className="font-medium text-green-600">${(card.sale_price || 0).toLocaleString()}</span>
                    </div>
                  )}
                  {editingPrice === card.id ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        type="number"
                        value={priceInput}
                        onChange={(e) => setPriceInput(e.target.value)}
                        className="w-24"
                        min="0"
                        step="0.01"
                      />
                      <Button size="sm" onClick={() => handleSalePriceUpdate(card.id)}>Set</Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setEditingPrice(null)
                        setPriceInput("")
                      }}>Cancel</Button>
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      variant={card.is_for_sale ? "default" : "outline"}
                      className="mt-2"
                      onClick={() => {
                        if (card.is_for_sale) {
                          onUpdateCardStatus(card.id, { is_for_sale: false, sale_price: null })
                        } else {
                          setEditingPrice(card.id)
                          setPriceInput(Number(cardDetails.prices?.usd || 0).toString())
                        }
                      }}
                    >
                      {card.is_for_sale ? "Remove from Sale" : "Mark for Sale"}
                    </Button>
                  )}
                </div>
                {card.notes && (
                  <div className="text-sm text-muted-foreground mt-2">
                    {card.notes}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )

  // Show message when no cards match search/filters
  if (sortedCards.length === 0 && (searchTerm.trim() || Object.values(filters).some(v => v !== null && v !== ""))) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end gap-2">
          <FilterDialog filters={filters} onFiltersChange={setFilters} />
          <ViewToggle currentView={viewMode} onViewChange={setViewMode} />
        </div>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-muted-foreground">No cards found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search terms or filters
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <FilterDialog filters={filters} onFiltersChange={setFilters} />
        <ViewToggle currentView={viewMode} onViewChange={setViewMode} />
      </div>
      {viewMode === 'grid' ? <GridView /> : <ListView />}
    </div>
  )
} 