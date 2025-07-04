import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter, Plus } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

type ScryfallImageUris = {
  small: string    // Smallest size (146x204)
  normal: string   // Normal size (488x680)
  large: string    // Large size (672x936)
  png: string      // PNG version
  art_crop: string // Cropped artwork only
  border_crop: string // Full card with borders cropped
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

const getCardImageUrl = (imageUris: any): string => {
  if (!imageUris) return 'https://placehold.co/488x680/374151/e5e7eb?text=No+Image'
  
  // Parse the JSONB data if it's a string
  const uris = typeof imageUris === 'string' ? JSON.parse(imageUris) : imageUris
  
  return uris.normal || 
         uris.large || 
         uris.small || 
         'https://placehold.co/488x680/374151/e5e7eb?text=No+Image'
}

export default async function CollectionPage() {
  const supabase = await createClient()

  // Get the current user's ID
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch user's cards with card details
  const { data: userCards, error } = await supabase
    .from('user_cards')
    .select(`
      id,
      quantity,
      condition,
      foil,
      notes,
      is_for_sale,
      sale_price,
      default_cards!inner (
        id,
        name,
        set_name,
        image_uris,
        prices
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .returns<UserCard[]>()

  if (error) {
    console.error('Error fetching collection:', error)
    return <div>Error loading collection</div>
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Collection</h1>
        <div className="flex gap-2">
          <Button>Import Cards</Button>
          <Link href="/collection/add">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Cards
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search cards..." className="pl-8" />
        </div>
        <div className="flex gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Container" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cards</SelectItem>
              <SelectItem value="deck1">Main Deck</SelectItem>
              <SelectItem value="binder1">Trade Binder</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="name">
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price">Price</SelectItem>
              <SelectItem value="condition">Condition</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {userCards?.map((card) => {
          const cardDetails = card.default_cards
          const imageUrl = getCardImageUrl(cardDetails.image_uris)
          const price = card.is_for_sale ? (card.sale_price ?? 0) : (Number(cardDetails.prices?.usd) || 0)

          return (
            <Card key={card.id} className="overflow-hidden">
              <div className="aspect-[3/4] relative">
                <img
                  src={imageUrl}
                  alt={cardDetails.name}
                  className="object-cover w-full h-full"
                  loading="lazy"
                />
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
                  <div className="font-medium">
                    ${price.toLocaleString()}
                    {card.is_for_sale && ' (For Sale)'}
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
    </div>
  )
} 