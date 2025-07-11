import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { WishlistItem } from "@/lib/types"
import { WishlistCard } from "@/components/wishlist-card"

async function getWishlistItems(): Promise<WishlistItem[]> {
  const supabase = await createClient()
  
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
    .order('created_at', { ascending: false })

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



export default async function WishlistPage() {
  const wishlistItems = await getWishlistItems()

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
          <Input placeholder="Search wishlist..." className="pl-8" />
        </div>
        <div className="flex gap-2">
          <Select defaultValue="priority">
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="price">Current Price</SelectItem>
              <SelectItem value="date">Date Added</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {wishlistItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Your wishlist is empty</p>
          <Link href="/wishlist/add">
            <Button className="mt-4">Add your first card</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {wishlistItems.map((item) => (
            <WishlistCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
} 