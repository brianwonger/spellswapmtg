'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, MapPin, ArrowLeft } from "lucide-react"
import { MarketplaceListing } from "@/lib/types"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"

const FALLBACK_CARD_IMAGE = "https://cards.scryfall.io/large/front/0/c/0c082aa8-bf7f-47f2-baf8-43ad253fd7d7.jpg"

interface SellerPageProps {
  params: {
    sellerName: string
  }
}

export default function SellerPage({ params }: SellerPageProps) {
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const decodedSellerName = decodeURIComponent(params.sellerName)

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
                <CardContent className="p-4">
                  <h3 className="font-semibold">{listing.name}</h3>
                  <p className="text-sm text-gray-500">{listing.set}</p>
                  <div className="mt-2 flex items-center justify-between">
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
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  )
} 