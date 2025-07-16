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
import { Search, Filter, MapPin } from "lucide-react"
import { getMarketplaceListings } from "@/lib/supabase/queries"
import { MarketplaceListing } from "@/lib/types"
import Image from "next/image"

const FALLBACK_CARD_IMAGE = "https://cards.scryfall.io/large/front/0/c/0c082aa8-bf7f-47f2-baf8-43ad253fd7d7.jpg"

export default async function MarketplacePage() {
  const listings: MarketplaceListing[] = await getMarketplaceListings()

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Marketplace</h1>
        <Button>
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search cards..."
            className="w-full"
          />
        </div>
        <Select defaultValue="all">
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
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin className="w-4 h-4 mr-1" />
                  {listing.location || "Unknown"}
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Seller: {listing.seller}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 