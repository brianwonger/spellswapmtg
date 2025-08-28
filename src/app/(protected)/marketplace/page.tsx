'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MapPin, ChevronUp, ChevronDown, Star, StarHalf, StarOff } from "lucide-react"
import { MarketplaceListing } from "@/lib/types"
import Image from "next/image"
import Link from "next/link"
import { FilterDialog, type MarketplaceFilters } from "@/components/marketplace/filter-dialog"
import { ViewMode, ViewToggle } from "@/components/ui/view-toggle"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { WishlistItem } from "@/lib/types"
import { ShoppingCart, Trash2 } from "lucide-react"
import { toast } from "sonner"

const FALLBACK_CARD_IMAGE = "https://cards.scryfall.io/large/front/0/c/0c082aa8-bf7f-47f2-baf8-43ad253fd7d7.jpg"

export default function MarketplacePage() {
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [filters, setFilters] = useState<Partial<MarketplaceFilters>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortConfig, setSortConfig] = useState<{
    key: keyof MarketplaceListing | null
    direction: 'asc' | 'desc'
  }>({ key: null, direction: 'asc' })
  const [wishlistFilter, setWishlistFilter] = useState<'all' | 'wishlist' | 'priority'>('wishlist')
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [isAddingToCart, setIsAddingToCart] = useState<string | null>(null);
  const [removingFromCart, setRemovingFromCart] = useState<string | null>(null);
  const [cartStatus, setCartStatus] = useState<Record<string, boolean>>({});


  const handleViewChange = (newMode: ViewMode) => {
    setViewMode(newMode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('marketplaceViewMode', newMode)
    }
  }

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

  const handleAddToCart = async (user_card_id: string) => {
    setIsAddingToCart(user_card_id);
    try {
      const response = await fetch('/api/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_card_id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add card to cart.');
      }

      // Update cart status
      setCartStatus(prev => ({ ...prev, [user_card_id]: true }))
      console.log('Card added to cart:', result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add card to cart.';
      toast.error(errorMessage);
    } finally {
      setIsAddingToCart(null);
    }
  };

  const handleRemoveFromCart = async (user_card_id: string) => {
    try {
      setRemovingFromCart(user_card_id)

      const response = await fetch('/api/cart/remove', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_card_id
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to remove item from cart (${response.status})`)
      }

      // Update cart status
      setCartStatus(prev => ({ ...prev, [user_card_id]: false }))
      console.log('Item removed from cart successfully')

    } catch (error) {
      console.error('Error removing from cart:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove item from cart'
      alert(`Error: ${errorMessage}`)
    } finally {
      setRemovingFromCart(null)
    }
  };


  // Initialize view mode from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('marketplaceViewMode') as ViewMode
      if (savedMode && (savedMode === 'grid' || savedMode === 'list')) {
        setViewMode(savedMode)
      }
    }
  }, [])

  const fetchWishlistItems = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        return []
      }

      const { data, error } = await supabase
        .from('wishlist_items')
        .select(`
          id,
          priority,
          max_price,
          preferred_condition,
          foil_preference,
          notes,
          created_at,
          default_cards!inner (
            id,
            name,
            type_line,
            oracle_text,
            flavor_text,
            image_uris,
            set_name,
            prices,
            rarity,
            set
          )
        `)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching wishlist:', error)
        return []
      }

      // Transform the data to match our interface
      return (data || []).map(item => ({
        id: item.id,
        priority: item.priority,
        max_price: item.max_price,
        preferred_condition: item.preferred_condition,
        foil_preference: item.foil_preference,
        notes: item.notes,
        created_at: item.created_at,
        default_cards: Array.isArray(item.default_cards) ? item.default_cards[0] : item.default_cards
      }))
    } catch (error) {
      console.error('Error fetching wishlist items:', error)
      return []
    }
  }, [])

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
      if (currentFilters.distance) {
        params.set('distance', currentFilters.distance.toString())
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

  // Load cart status when listings change
  useEffect(() => {
    if (listings.length > 0) {
      const listingIds = listings.map(listing => listing.id)
      loadCartStatus(listingIds)
    }
  }, [listings, loadCartStatus])

  // Load wishlist items on component mount
  useEffect(() => {
    const loadWishlist = async () => {
      const items = await fetchWishlistItems()
      setWishlistItems(items)
    }
    loadWishlist()
  }, [fetchWishlistItems])

  const handleFiltersChange = (newFilters: MarketplaceFilters) => {
    setFilters(prevFilters => ({ ...prevFilters, ...newFilters }))
  }

  const handleCategoryChange = (category: string) => {
    setFilters(prevFilters => ({ ...prevFilters, format: category === 'all' ? undefined : category }))
  }

  const handleSort = (key: keyof MarketplaceListing) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const getSortedListings = (listings: MarketplaceListing[]) => {
    if (!sortConfig.key) return listings

    return [...listings].sort((a, b) => {
      const aValue = a[sortConfig.key!]
      const bValue = b[sortConfig.key!]

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1

      // Handle different data types
      let comparison = 0
      if (sortConfig.key === 'price') {
        // Price is a number
        comparison = (aValue as number) - (bValue as number)
      } else if (sortConfig.key === 'distance') {
        // Distance is a number
        comparison = (aValue as number) - (bValue as number)
      } else {
        // Everything else is a string
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
  }

  const getSortIcon = (columnKey: keyof MarketplaceListing) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronUp className="w-4 h-4 opacity-50" />
    }
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />
  }

  const getWishlistIcon = () => {
    switch (wishlistFilter) {
      case 'all':
        return <StarOff className="w-5 h-5 text-muted-foreground" />
      case 'wishlist':
        return <StarHalf className="w-5 h-5 text-yellow-500 fill-yellow-500" />
      case 'priority':
        return <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
      default:
        return <StarOff className="w-5 h-5 text-muted-foreground" />
    }
  }

  const handleWishlistFilterToggle = () => {
    setWishlistFilter(prev => {
      switch (prev) {
        case 'all': return 'wishlist'
        case 'wishlist': return 'priority'
        case 'priority': return 'all'
        default: return 'all'
      }
    })
  }

  const filterListingsByWishlist = (listings: MarketplaceListing[]) => {
    if (wishlistFilter === 'all') return listings

    // Get card names from wishlist
    const wishlistCardNames = new Set(wishlistItems.map(item => item.default_cards.name.toLowerCase()))

    if (wishlistFilter === 'wishlist') {
      // Show only cards that are in wishlist
      return listings.filter(listing =>
        wishlistCardNames.has(listing.name.toLowerCase())
      )
    }

    if (wishlistFilter === 'priority') {
      // Show only high priority wishlist cards
      const highPriorityCardNames = new Set(
        wishlistItems
          .filter(item => item.priority === 'high')
          .map(item => item.default_cards.name.toLowerCase())
      )
      return listings.filter(listing =>
        highPriorityCardNames.has(listing.name.toLowerCase())
      )
    }

    return listings
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleWishlistFilterToggle}
            className={`h-10 w-10 transition-all duration-200 ${
              wishlistFilter !== 'all'
                ? 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100'
                : 'hover:bg-muted'
            }`}
            title={
              wishlistFilter === 'all'
                ? 'Show all cards'
                : wishlistFilter === 'wishlist'
                ? 'Showing wishlist cards'
                : 'Showing high priority wishlist cards'
            }
          >
            {getWishlistIcon()}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle currentView={viewMode} onViewChange={handleViewChange} />
        </div>
        <div className="flex gap-2">
          <Select
            value={filters.distance?.toString() || '10'}
            onValueChange={(value) => setFilters(prev => ({ ...prev, distance: parseInt(value) }))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Distance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Less than 3km</SelectItem>
              <SelectItem value="10">Less than 10km</SelectItem>
              <SelectItem value="100">Less than 100km</SelectItem>
            </SelectContent>
          </Select>
          <FilterDialog onFiltersChange={handleFiltersChange} />
        </div>
      </div>

      {viewMode === 'grid' ? (
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
          ) : filterListingsByWishlist(listings).length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">
                {wishlistFilter !== 'all'
                  ? wishlistFilter === 'wishlist'
                    ? "No cards from your wishlist are currently for sale."
                    : "No high priority wishlist cards are currently for sale."
                  : "No cards found matching your criteria."
                }
              </p>
            </div>
          ) : (
            getSortedListings(filterListingsByWishlist(listings)).map((listing) => (
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
                  {cartStatus[listing.id] ? (
                    <Button 
                      onClick={() => handleRemoveFromCart(listing.id)}
                      disabled={removingFromCart === listing.id}
                      className="w-full mt-4"
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
                      className="w-full mt-4" 
                      onClick={() => handleAddToCart(listing.id)}
                      disabled={isAddingToCart === listing.id}
                    >
                      {isAddingToCart === listing.id ? (
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
            ))
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">
                  <button
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    Card
                    {getSortIcon('name')}
                  </button>
                </th>
                <th className="text-left py-2 px-3">
                  <button
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    onClick={() => handleSort('set')}
                  >
                    Set
                    {getSortIcon('set')}
                  </button>
                </th>
                <th className="text-left py-2 px-3">
                  <button
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    onClick={() => handleSort('condition')}
                  >
                    Condition
                    {getSortIcon('condition')}
                  </button>
                </th>
                <th className="text-right py-2 px-3">
                  <button
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors ml-auto"
                    onClick={() => handleSort('price')}
                  >
                    Price
                    {getSortIcon('price')}
                  </button>
                </th>
                <th className="text-left py-2 px-3">
                  <button
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    onClick={() => handleSort('distance')}
                  >
                    Location
                    {getSortIcon('distance')}
                  </button>
                </th>
                <th className="text-left py-2 px-3">
                  <button
                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    onClick={() => handleSort('seller')}
                  >
                    Seller
                    {getSortIcon('seller')}
                  </button>
                </th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                // Loading skeleton for table
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b animate-pulse">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-16 bg-gray-200 rounded" />
                        <div className="h-4 bg-gray-200 rounded w-32" />
                      </div>
                    </td>
                    <td className="py-3 px-3"><div className="h-3 bg-gray-200 rounded w-20" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-gray-200 rounded w-16" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-gray-200 rounded w-12" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-gray-200 rounded w-24" /></td>
                    <td className="py-3 px-3"><div className="h-3 bg-gray-200 rounded w-20" /></td>
                  </tr>
                ))
              ) : filterListingsByWishlist(listings).length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <p className="text-gray-500">
                      {wishlistFilter !== 'all'
                        ? wishlistFilter === 'wishlist'
                          ? "No cards from your wishlist are currently for sale."
                          : "No high priority wishlist cards are currently for sale."
                        : "No cards found matching your criteria."
                      }
                    </p>
                  </td>
                </tr>
              ) : (
                getSortedListings(filterListingsByWishlist(listings)).map((listing) => (
                  <tr key={listing.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-16 relative flex-shrink-0">
                          <Image
                            src={listing.imageUrl || FALLBACK_CARD_IMAGE}
                            alt={listing.name}
                            fill
                            className="object-cover rounded"
                            sizes="48px"
                          />
                        </div>
                        <span className="font-medium">{listing.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">{listing.set}</td>
                    <td className="py-3 px-3">{listing.condition}</td>
                    <td className="py-3 px-3 text-right font-medium">
                      ${listing.price?.toFixed(2) ?? 'N/A'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="w-4 h-4 mr-1" />
                        {listing.distance !== undefined
                          ? `${listing.distance.toFixed(1)} km`
                          : listing.location || "Unknown"
                        }
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <Link
                        href={`/marketplace/seller/${encodeURIComponent(listing.seller)}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {listing.seller}
                      </Link>
                    </td>
                    <td className="py-3 px-3">
                      {cartStatus[listing.id] ? (
                        <Button 
                          onClick={() => handleRemoveFromCart(listing.id)}
                          disabled={removingFromCart === listing.id}
                          size="sm"
                          variant="destructive"
                        >
                          {removingFromCart === listing.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                              Removing
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3 h-3 mr-1" />
                              Remove
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button 
                          size="sm"
                          onClick={() => handleAddToCart(listing.id)}
                          disabled={isAddingToCart === listing.id}
                        >
                          {isAddingToCart === listing.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                              Adding
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-3 h-3 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
} 