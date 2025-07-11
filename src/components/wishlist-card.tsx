'use client'

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Star, StarHalf, StarOff } from "lucide-react"
import { WishlistItem } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"

interface WishlistCardProps {
  item: WishlistItem
  onPriorityUpdate?: (itemId: string, newPriority: string) => void
}

const PriorityIcon = ({ priority }: { priority: string }) => {
  switch (priority) {
    case "high":
      return <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
    case "medium":
      return <StarHalf className="h-4 w-4 text-yellow-500 fill-yellow-500" />
    case "low":
      return <StarOff className="h-4 w-4 text-muted-foreground" />
    default:
      return null
  }
}

const getCardImageUrl = (imageUris: string | null | undefined): string => {
  if (!imageUris) return 'https://placehold.co/488x680/374151/e5e7eb?text=No+Image'
  
  try {
    const uris = JSON.parse(imageUris)
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

function getCurrentPrice(prices: any): number {
  if (!prices || typeof prices !== 'object') return 0
  
  if (prices.usd) return parseFloat(prices.usd) || 0
  if (prices.usd_foil) return parseFloat(prices.usd_foil) || 0
  
  const priceValues = Object.values(prices).filter(price => 
    typeof price === 'string' && !isNaN(parseFloat(price))
  )
  return priceValues.length > 0 ? parseFloat(priceValues[0] as string) : 0
}

export function WishlistCard({ item, onPriorityUpdate }: WishlistCardProps) {
  const [priority, setPriority] = useState(item.priority)
  const [isUpdating, setIsUpdating] = useState(false)

  const updatePriority = async (newPriority: string) => {
    if (newPriority === priority) return
    
    setIsUpdating(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('wishlist_items')
        .update({ priority: newPriority })
        .eq('id', item.id)

      if (error) {
        console.error('Error updating priority:', error)
        return
      }

      setPriority(newPriority)
      onPriorityUpdate?.(item.id, newPriority)
    } catch (error) {
      console.error('Error updating priority:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const currentPrice = getCurrentPrice(item.default_cards.prices)
  const maxPrice = item.max_price || 0
  const imageUrl = getCardImageUrl(item.default_cards.image_uris)

  return (
    <Card className="overflow-hidden">
      <div className="aspect-[3/4] relative">
        <img
          src={imageUrl}
          alt={item.default_cards.name}
          className="object-cover w-full h-full"
        />
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-background/90 hover:bg-background rounded-full"
                disabled={isUpdating}
              >
                <PriorityIcon priority={priority} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem 
                onClick={() => updatePriority('high')}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                High
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => updatePriority('medium')}
                className="flex items-center gap-2 cursor-pointer"
              >
                <StarHalf className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                Medium
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => updatePriority('low')}
                className="flex items-center gap-2 cursor-pointer"
              >
                <StarOff className="h-4 w-4 text-muted-foreground" />
                Low
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <CardHeader>
        <CardTitle className="text-lg">{item.default_cards.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          <div className="text-sm text-muted-foreground">
            {item.default_cards.set_name}
          </div>
          {maxPrice > 0 && (
            <div className="flex justify-between items-center">
              <div className="text-sm">Max Price:</div>
              <div className="font-medium">
                ${maxPrice.toLocaleString()}
              </div>
            </div>
          )}
          {currentPrice > 0 && (
            <div className="flex justify-between items-center">
              <div className="text-sm">Current Price:</div>
              <div className={`font-medium ${
                maxPrice > 0 && currentPrice > maxPrice 
                  ? "text-red-500" 
                  : "text-green-500"
              }`}>
                ${currentPrice.toLocaleString()}
              </div>
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            Priority: {priority}
          </div>
          <Button 
            variant="outline" 
            className="w-full"
            disabled={maxPrice > 0 && currentPrice > maxPrice}
          >
            {maxPrice > 0 && currentPrice > maxPrice 
              ? "Above Max Price" 
              : "Find Sellers"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 