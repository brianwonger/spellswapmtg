'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MapPin } from "lucide-react"
import { MarketplaceListing } from "@/lib/types"
import Image from "next/image"
import Link from "next/link"
import { FilterDialog, type MarketplaceFilters } from "@/components/marketplace/filter-dialog"
import { useState, useEffect, useCallback } from "react"

const FALLBACK_CARD_IMAGE = "https://cards.scryfall.io/large/front/0/c/0c082aa8-bf7f-47f2-baf8-43ad253fd7d7.jpg"

export default function MarketplacePage() {
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [filters, setFilters] = useState<Partial<MarketplaceFilters>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const loadListings = useCallback(async (currentFilters: Partial<MarketplaceFilters>, query: string) => {
    try {
      setIsLoading(true)
      
      const params = new URLSearchParams()
      
      if (currentFilters.colors?.length) {
        params.set('colors', currentFilters.colors.join(','))
      }
      if (currentFilters.manaCosts?.length) {
        params.set('manaCosts', currentFilters.manaCosts.join(','))
      }
      if (currentFilters.format) {
        params.set('format', currentFilters.format)
      }
      if (currentFilters.setName) {
        params.set('setName', currentFilters.setName)
      }
      if (currentFilters.rarity?.length) {
        params.set('rarity', currentFilters.rarity.join(','))
      }
      if (currentFilters.priceRange?.min) {
        params.set('priceMin', currentFilters.priceRange.min)
      }
      if (currentFilters.priceRange?.max) {
        params.set('priceMax', currentFilters.priceRange.max)
      }
      if (query) {
        params.set('search', query)
      }

      const response = await fetch(`/api/marketplace?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch listings')
      
      const data = await response.json()
      setListings(data)
    } catch (error) {
      console.error('Error loading listings:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadListings(filters, searchQuery)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [filters, searchQuery, loadListings])

  const handleFiltersChange = (newFilters: MarketplaceFilters) => {
    setFilters(prevFilters => ({ ...prevFilters, ...newFilters }))
  }

  const handleCategoryChange = (category: string) => {
    setFilters(prevFilters => ({ ...prevFilters, format: category === 'all' ? undefined : category }))
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Marketplace</h1>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search cards..."
            className="w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select 
            value={filters.format || 'all'} 
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="modern">Modern</SelectItem>
              <SelectItem value="commander">Commander</SelectItem>
            </SelectContent>
          </Select>
          <FilterDialog onFiltersChange={handleFiltersChange} />
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
            <p className="text-gray-500">No cards found matching your criteria.</p>
          </div>
        ) : (
          listings.map((listing) => (
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
                    <span className="font-medium">${listing.price?.toFixed(2) ?? 'N/A'}</span> ·{" "}
                    <span className="text-gray-500">{listing.condition}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin className="w-4 h-4 mr-1" />
                    {listing.distance !== undefined 
                      ? `${listing.distance.toFixed(1)} km`
                      : listing.location || "Unknown"
                    }
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Seller:{" "}
                  <Link 
                    href={`/marketplace/seller/${encodeURIComponent(listing.seller)}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {listing.seller}
                  </Link>
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
} 