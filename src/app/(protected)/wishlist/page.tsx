'use client'

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, ArrowUpDown } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { WishlistItem } from "@/lib/types"
import { WishlistCard } from "@/components/wishlist-card"
import { useState, useEffect } from "react"
import { FilterDialog, WishlistFilters } from "@/components/wishlist/filter-dialog"

async function getWishlistItems(): Promise<WishlistItem[]> {
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
}

export default function WishlistPage() {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [sortBy, setSortBy] = useState("priority")
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilters, setActiveFilters] = useState<WishlistFilters>({
    cardType: "all",
    rarity: "all",
    setName: "all",
    priority: "all",
    foilPreference: "all",
    condition: "all",
    priceMin: "",
    priceMax: "",
    dateRange: "all",
    withinBudget: "all",
  })

  useEffect(() => {
    async function fetchWishlist() {
      const items = await getWishlistItems()
      setWishlistItems(items)
      setLoading(false)
    }
    fetchWishlist()
  }, [])

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  const handleFiltersChange = (filters: WishlistFilters) => {
    setActiveFilters(filters)
  }

  const filterItems = (items: WishlistItem[]) => {
    return items.filter(item => {
      // Search query filter
      if (searchQuery && !item.default_cards.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }

      // Card Type filter
      if (activeFilters.cardType !== "all") {
        const typeMatch = item.default_cards.type_line.toLowerCase().includes(activeFilters.cardType.toLowerCase())
        if (!typeMatch) return false
      }

      // Rarity filter
      if (activeFilters.rarity !== "all") {
        const rarityMatch = item.default_cards.rarity.toLowerCase() === activeFilters.rarity.toLowerCase()
        if (!rarityMatch) return false
      }

      // Priority filter
      if (activeFilters.priority !== "all") {
        const priorityMatch = item.priority?.toLowerCase() === activeFilters.priority.toLowerCase()
        if (!priorityMatch) return false
      }

      // Foil preference filter
      if (activeFilters.foilPreference !== "all") {
        const foilMatch = item.foil_preference === activeFilters.foilPreference
        if (!foilMatch) return false
      }

      // Condition filter
      if (activeFilters.condition !== "all") {
        const conditionMatch = item.preferred_condition === activeFilters.condition
        if (!conditionMatch) return false
      }

      // Price range filter
      const price = parseFloat(item.default_cards.prices?.usd || '0')
      if (activeFilters.priceMin && !isNaN(parseFloat(activeFilters.priceMin))) {
        if (price < parseFloat(activeFilters.priceMin)) return false
      }
      if (activeFilters.priceMax && !isNaN(parseFloat(activeFilters.priceMax))) {
        if (price > parseFloat(activeFilters.priceMax)) return false
      }

      // Budget status filter
      if (activeFilters.withinBudget !== "all") {
        const maxPrice = parseFloat(item.max_price?.toString() || '0')
        const currentPrice = parseFloat(item.default_cards.prices?.usd || '0')
        
        if (activeFilters.withinBudget === 'within' && currentPrice > maxPrice) {
          return false
        }
        if (activeFilters.withinBudget === 'over' && currentPrice <= maxPrice) {
          return false
        }
      }

      // Date range filter
      if (activeFilters.dateRange !== "all") {
        const itemDate = new Date(item.created_at)
        const now = new Date()
        const daysDiff = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24)

        switch (activeFilters.dateRange) {
          case 'today':
            if (daysDiff >= 1) return false
            break
          case 'week':
            if (daysDiff >= 7) return false
            break
          case 'month':
            if (daysDiff >= 30) return false
            break
          case 'year':
            if (daysDiff >= 365) return false
            break
        }
      }

      return true
    })
  }

  const sortedAndFilteredItems = filterItems([...wishlistItems]).sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case "name":
        comparison = a.default_cards.name.localeCompare(b.default_cards.name)
        break
      case "priority": {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        const aPriority = priorityOrder[a.priority?.toLowerCase() as keyof typeof priorityOrder] ?? 3
        const bPriority = priorityOrder[b.priority?.toLowerCase() as keyof typeof priorityOrder] ?? 3
        comparison = aPriority - bPriority
        break
      }
      case "price":
        const aPrice = parseFloat(a.default_cards.prices?.usd || '0')
        const bPrice = parseFloat(b.default_cards.prices?.usd || '0')
        comparison = bPrice - aPrice
        break
      case "date":
        comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        break
      default:
        comparison = 0
    }

    return sortDirection === 'asc' ? comparison : -comparison
  })

  if (loading) {
    return <div className="container py-8">Loading...</div>
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Wishlist</h1>
        <Link href="/wishlist/add">
          <Button>Add to Wishlist</Button>
        </Link>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search wishlist..." 
            className="pl-8" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 p-0"
              onClick={toggleSortDirection}
            >
              <ArrowUpDown 
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  sortDirection === 'asc' ? 'rotate-180' : ''
                }`} 
              />
            </Button>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="price">Market Price</SelectItem>
                <SelectItem value="date">Date Added</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <FilterDialog onFiltersChange={handleFiltersChange} />
        </div>
      </div>

      {sortedAndFilteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {wishlistItems.length === 0 
              ? "Your wishlist is empty" 
              : "No items match your filters"}
          </p>
          {wishlistItems.length === 0 && (
            <Link href="/wishlist/add">
              <Button className="mt-4">Add your first card</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedAndFilteredItems.map((item) => (
            <WishlistCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
} 