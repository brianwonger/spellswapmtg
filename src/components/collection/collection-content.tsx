'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useRef, useEffect } from "react"
import { ViewMode } from "../ui/view-toggle"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { UserCard } from '@/lib/types'
import { EditCardDialog } from "./edit-card-dialog"
import { Container } from '@/lib/types'
import { CardFilters } from "./filter-dialog"

interface CollectionContentProps {
  userCards: UserCard[]
  searchTerm?: string
  sortBy?: string
  container?: string
  filters: CardFilters
  viewMode: ViewMode
  onDeleteCard: (cardId: string) => Promise<boolean>
  onUpdateCardStatus: (cardId: string, updates: {
    is_for_sale?: boolean
    sale_price?: number | null
  }) => Promise<boolean>
  onUpdateCard: (cardId: string, updates: {
    quantity: number
    condition: string
    foil: boolean
    notes: string | null
    is_for_sale: boolean
    sale_price: number | null
  }) => Promise<boolean>
  availableContainers: Container[]
  onUpdateContainerItems: (userCardId: string, updates: { container_id: string; quantity: number }[]) => Promise<boolean>
}

const getCardImageUrl = (imageUris: string | null): string => {
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



const getCardQuantity = (card: UserCard, selectedContainer: string) => {
  if (selectedContainer === "all") {
    // For "All Containers", show total quantity across all containers
    return card.quantity
  } else {
    // For specific container, show quantity in that container
    const containerItem = card.container_items?.find(item => 
      item.container_id === selectedContainer
    )
    return containerItem?.quantity || 0
  }
}

export function CollectionContent({
  userCards,
  searchTerm = "",
  sortBy = "name",
  container = "all",
  filters,
  viewMode,
  onDeleteCard,
  onUpdateCardStatus,
  onUpdateCard,
  availableContainers,
  onUpdateContainerItems
}: CollectionContentProps) {
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [priceInput, setPriceInput] = useState<string>("")
  const [editingCard, setEditingCard] = useState<UserCard | null>(null)
  const priceInputRef = useRef<HTMLInputElement>(null)

  // Focus management
  useEffect(() => {
    if (editingPrice && priceInputRef.current) {
      priceInputRef.current.focus()
    }
  }, [editingPrice, priceInput])

  // Apply search filtering
  const searchFilteredCards = userCards.filter(card => {
    // First apply container filter
    if (container !== "all") {
      const hasContainer = card.container_items?.some(item => 
        item.container_id === container && item.quantity > 0
      )
      if (!hasContainer) {
        return false
      }
    }

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
    // Apply sale status filter
    if (filters.saleStatus === 'for_sale' && !card.is_for_sale) {
      return false
    }
    if (filters.saleStatus === 'not_for_sale' && card.is_for_sale) {
      return false
    }

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
    const price = parseFloat(priceInput.replace(/[^0-9.]/g, ''))
    if (isNaN(price) || price < 0) return
    
    await onUpdateCardStatus(cardId, { 
      sale_price: price,
      is_for_sale: true
    })
    setEditingPrice(null)
    setPriceInput("")
  }

  const handlePriceInput = (value: string) => {
    // Remove any non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.]/g, '')
    
    // Ensure only one decimal point
    const parts = cleaned.split('.')
    if (parts.length > 2) return
    
    // Limit to 2 decimal places
    if (parts[1]?.length > 2) return
    
    // Don't allow just a decimal point
    if (cleaned === '.') return
    
    setPriceInput(cleaned)
    // Ensure input stays focused after state update
    priceInputRef.current?.focus()
  }

  const formatPrice = (price: number | null): string => {
    if (price === null) return ''
    return `$${price.toFixed(2)}`
  }

  const PriceInput = ({ cardId }: { cardId: string }) => (
    <div className="flex items-center gap-2 mt-2">
      <Input
        ref={priceInputRef}
        type="text"
        value={priceInput}
        onChange={(e) => handlePriceInput(e.target.value)}
        className="w-24"
        placeholder="0.00"
        inputMode="decimal"
        onBlur={() => {
          // Small delay to allow for button clicks
          setTimeout(() => {
            if (document.activeElement?.tagName !== 'BUTTON') {
              priceInputRef.current?.focus()
            }
          }, 10)
        }}
      />
      <Button size="sm" onClick={() => handleSalePriceUpdate(cardId)}>Set</Button>
      <Button size="sm" variant="ghost" onClick={() => {
        setEditingPrice(null)
        setPriceInput("")
      }}>Cancel</Button>
    </div>
  )

  const GridView = () => (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sortedCards?.map((card) => {
        const cardDetails = card.default_cards
        const imageUrl = getCardImageUrl(cardDetails.image_uris)
        const quantity = getCardQuantity(card, container)

        return (
          <Card key={card.id} className="overflow-hidden group">
            <div className="aspect-[3/4] relative p-2 bg-muted/10">
              <Image
                src={imageUrl}
                alt={cardDetails.name}
                fill
                className="object-cover rounded-sm"
              />
              {card.is_for_sale && (
                <div className="absolute top-2 left-2 bg-primary/80 text-primary-foreground px-2 py-0.5 rounded-br-lg text-sm font-medium">
                  For Sale
                </div>
              )}
              <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditingCard(card)}
                  className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                  title="Edit card"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                    <path d="m15 5 4 4"></path>
                  </svg>
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to remove this card from your collection?')) {
                      await onDeleteCard(card.id)
                    }
                  }}
                  className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                  title="Remove card"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
            <CardHeader>
              <CardTitle className="text-lg">{cardDetails.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-1">
                <div className="text-sm text-muted-foreground">
                  {cardDetails.set_name} • {card.condition.replace('_', ' ')}
                  {card.foil && ' • Foil'}
                  {quantity > 1 && ` • Qty: ${quantity}`}
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-muted-foreground">Market Price:</span>
                    <span className="font-medium">{formatPrice(Number(cardDetails.prices?.usd || 0))}</span>
                  </div>
                  {card.is_for_sale && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-muted-foreground">Sale Price:</span>
                      <span className="font-medium text-green-600">{formatPrice(card.sale_price || 0)}</span>
                    </div>
                  )}
                  {editingPrice === card.id ? (
                    <PriceInput cardId={card.id} />
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
                          setPriceInput(formatPrice(Number(cardDetails.prices?.usd || 0)))
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
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3">Name</th>
            <th className="text-left py-2 px-3">Set</th>
            <th className="text-center py-2 px-3">Qty</th>
            <th className="text-left py-2 px-3">Condition</th>
            <th className="text-right py-2 px-3">Market Price</th>
            <th className="text-right py-2 px-3">Sale Price</th>
            <th className="text-center py-2 px-3">Sale Status</th>
            <th className="text-center py-2 px-3 w-[120px]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedCards?.map((card) => {
            const cardDetails = card.default_cards
            const quantity = getCardQuantity(card, container)

            return (
              <tr key={card.id} className="border-b hover:bg-muted/50">
                <td className="py-2 px-3">
                  <div>
                    <div className="font-medium">{cardDetails.name}</div>
                    {card.foil && <span className="text-sm text-muted-foreground">Foil</span>}
                    {card.notes && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {card.notes}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-2 px-3">{cardDetails.set_name}</td>
                <td className="text-center py-2 px-3">{quantity}</td>
                <td className="py-2 px-3">{card.condition.replace('_', ' ')}</td>
                <td className="text-right py-2 px-3">{formatPrice(Number(cardDetails.prices?.usd || 0))}</td>
                <td className="text-right py-2 px-3">
                  {card.is_for_sale ? (
                    <span className="text-green-600">{formatPrice(card.sale_price || 0)}</span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="py-2 px-3">
                  {editingPrice === card.id ? (
                    <div className="flex justify-center">
                      <PriceInput cardId={card.id} />
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <Button 
                        size="sm" 
                        variant={card.is_for_sale ? "default" : "outline"}
                        onClick={() => {
                          if (card.is_for_sale) {
                            onUpdateCardStatus(card.id, { is_for_sale: false, sale_price: null })
                          } else {
                            setEditingPrice(card.id)
                            setPriceInput(formatPrice(Number(cardDetails.prices?.usd || 0)))
                          }
                        }}
                      >
                        {card.is_for_sale ? "Remove from Sale" : "Mark for Sale"}
                      </Button>
                    </div>
                  )}
                </td>
                <td className="py-2 px-3">
                  <div className="flex justify-center items-center gap-1">
                    <div className="w-[55px] flex justify-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingCard(card)}
                        title="Edit card"
                        className="h-8 w-8"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                          <path d="m15 5 4 4"></path>
                        </svg>
                      </Button>
                    </div>
                    <div className="w-[55px] flex justify-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to remove this card from your collection?')) {
                            await onDeleteCard(card.id)
                          }
                        }}
                        title="Remove card"
                        className="h-8 w-8"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                      </Button>
                    </div>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  // Show message when no cards match search/filters
  if (sortedCards.length === 0 && (searchTerm.trim() || Object.values(filters).some(v => v !== null && v !== ""))) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-muted-foreground">No cards found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your search terms or filters
        </p>
      </div>
    )
  }

  return (
    <>
      {viewMode === 'grid' ? <GridView /> : <ListView />}

      {editingCard && (
        <EditCardDialog
          card={editingCard}
          open={!!editingCard}
          onOpenChange={(open) => !open && setEditingCard(null)}
          onUpdateCard={onUpdateCard}
          containers={availableContainers}
          onUpdateContainerItems={onUpdateContainerItems}
        />
      )}
    </>
  )
} 