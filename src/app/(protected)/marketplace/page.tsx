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

// Mock data for initial development
const mockListings = [
  {
    id: 1,
    name: "Jace, the Mind Sculptor",
    set: "Worldwake",
    condition: "Near Mint",
    price: 120,
    seller: "MTGDealer123",
    location: "New York, NY",
    distance: 2.5,
    imageUrl: "https://placehold.co/300x400",
  },
  {
    id: 2,
    name: "Tarmogoyf",
    set: "Future Sight",
    condition: "Lightly Played",
    price: 80,
    seller: "CardCollector",
    location: "Brooklyn, NY",
    distance: 4.8,
    imageUrl: "https://placehold.co/300x400",
  },
  // Add more mock listings as needed
]

export default function MarketplacePage() {
  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Marketplace</h1>
        <Button>List Cards for Sale</Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search listings..." className="pl-8" />
        </div>
        <div className="flex gap-2">
          <Select defaultValue="distance">
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="distance">Distance</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="condition">Condition</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="25">
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Distance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">Within 10 miles</SelectItem>
              <SelectItem value="25">Within 25 miles</SelectItem>
              <SelectItem value="50">Within 50 miles</SelectItem>
              <SelectItem value="100">Within 100 miles</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mockListings.map((listing) => (
          <Card key={listing.id} className="overflow-hidden">
            <div className="aspect-[3/4] relative">
              <img
                src={listing.imageUrl}
                alt={listing.name}
                className="object-cover w-full h-full"
              />
            </div>
            <CardHeader>
              <CardTitle className="text-lg">{listing.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <div className="text-sm text-muted-foreground">
                  {listing.set} • {listing.condition}
                </div>
                <div className="font-medium text-lg">
                  ${listing.price.toLocaleString()}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 mr-1" />
                  {listing.location} ({listing.distance} miles)
                </div>
                <div className="text-sm">
                  Seller: {listing.seller}
                </div>
                <Button className="w-full">Contact Seller</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 