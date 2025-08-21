'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, MapPin, ArrowLeft, ShoppingCart, Trash2 } from "lucide-react"
import { MarketplaceListing } from "@/lib/types"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"

const FALLBACK_CARD_IMAGE = "https://cards.scryfall.io/large/front/0/c/0c082aa8-bf7f-47f2-baf8-43ad253fd7d7.jpg"

interface SellerPageClientProps {
  sellerName: string
}

export default function SellerPageClient({ sellerName }: SellerPageClientProps) {
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const [removingFromCart, setRemovingFromCart] = useState<string | null>(null)
  const [cartStatus, setCartStatus] = useState<Record<string, boolean>>({})
  const decodedSellerName = decodeURIComponent(sellerName)

  const loadSellerListings = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Build query parameters
      const searchParams = new URLSearchParams()
      searchParams.set('seller', decodedSellerName)
      if (searchQuery) {
        searchParams.set('search', searchQuery)
      }

      const response = await fetch(`/api/marketplace?${searchParams.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch seller listings')
      
      const data = await response.json()
      setListings(data)
    } catch (error) {
      console.error('Error loading seller listings:', error)
      setListings([])
    } finally {
      setIsLoading(false)
    }
  }, [decodedSellerName, searchQuery])

  const loadCartStatus = useCallback(async (listingIds: string[]) => {
    if (listingIds.length === 0) return

    try {
      const response = await fetch(`/api/cart/status?user_card_ids=${listingIds.join(',')}`)
      if (response.ok) {
        const status = await response.json()
        setCartStatus(status)
      }
    } catch (error) {
      console.error('Error loading cart status:', error)
    }
  }, [])

  const handleAddToCart = async (listing: MarketplaceListing) => {
    try {
      setAddingToCart(listing.id)
      
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_card_id: listing.id,
          quantity: 1
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add item to cart')
      }

      // Update cart status
      setCartStatus(prev => ({ ...prev, [listing.id]: true }))
      console.log('Item added to cart successfully')
      
    } catch (error) {
      console.error('Error adding to cart:', error)
    } finally {
      setAddingToCart(null)
    }
  }

  const handleRemoveFromCart = async (listing: MarketplaceListing) => {
    try {
      setRemovingFromCart(listing.id)
      
      const response = await fetch('/api/cart/remove', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_card_id: listing.id
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to remove item from cart')
      }

      // Update cart status
      setCartStatus(prev => ({ ...prev, [listing.id]: false }))
      console.log('Item removed from cart successfully')
      
    } catch (error) {
      console.error('Error removing from cart:', error)
    } finally {
      setRemovingFromCart(null)
    }
  }

  // Load initial data and reload when search changes
  useEffect(() => {
    loadSellerListings()
  }, [decodedSellerName, loadSellerListings])

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      loadSellerListings()
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, loadSellerListings])

  // Load cart status when listings change
  useEffect(() => {
    if (listings.length > 0) {
      const listingIds = listings.map(listing => listing.id)
      loadCartStatus(listingIds)
    }
  }, [listings, loadCartStatus])

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/marketplace">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Marketplace
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{decodedSellerName}&apos;s Cards</h1>
          <p className="text-gray-600">Browse all cards for sale by this seller</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="search"
              placeholder="Search this seller's cards..."
              className="pl-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="aspect-[3/4] bg-gray-200" />
              <CardContent className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="flex justify-between">
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : listings.length === 0 ? (
          <div className="col-span-full text-center py-12">
            {searchQuery ? (
              <div>
                <p className="text-gray-500">No cards found matching &quot;{searchQuery}&quot;</p>
                <p className="text-sm text-gray-400 mt-2">
                  Try adjusting your search or{" "}
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    view all cards by {decodedSellerName}
                  </button>
                </p>
              </div>
            ) : (
              <p className="text-gray-500">
                {decodedSellerName} doesn&apos;t have any cards for sale at the moment.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="col-span-full">
              <p className="text-sm text-gray-600">
                Showing {listings.length} card{listings.length !== 1 ? 's' : ''} for sale
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            </div>
            {listings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden">
                <div className="aspect-[3/4] relative">
                  <Image
                    src={listing.imageUrl || FALLBACK_CARD_IMAGE}
                    alt={listing.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-semibold">{listing.name}</h3>
                  <p className="text-sm text-gray-500">{listing.set}</p>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium">${listing.price}</span> ·{" "}
                      <span className="text-gray-500">{listing.condition}</span>
                    </div>
                    {listing.location && (
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="w-4 h-4 mr-1" />
                        {listing.location}
                      </div>
                    )}
                  </div>
                  {cartStatus[listing.id] ? (
                    <Button 
                      onClick={() => handleRemoveFromCart(listing)}
                      disabled={removingFromCart === listing.id}
                      className="w-full"
                      size="sm"
                      variant="destructive"
                    >
                      {removingFromCart === listing.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          Removing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove from Cart
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleAddToCart(listing)}
                      disabled={addingToCart === listing.id}
                      className="w-full"
                      size="sm"
                    >
                      {addingToCart === listing.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Add to Cart
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  )
}