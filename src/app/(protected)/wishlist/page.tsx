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
import { Search, Filter, Star, StarHalf, StarOff } from "lucide-react"

// Mock data for initial development
const mockWishlist = [
  {
    id: 1,
    name: "Volcanic Island",
    set: "Revised",
    priority: "high",
    maxPrice: 800,
    currentPrice: 850,
    imageUrl: "https://placehold.co/300x400",
    availableNearby: 2,
  },
  {
    id: 2,
    name: "Force of Will",
    set: "Alliances",
    priority: "medium",
    maxPrice: 120,
    currentPrice: 110,
    imageUrl: "https://placehold.co/300x400",
    availableNearby: 5,
  },
  // Add more mock wishlist items as needed
]

const PriorityIcon = ({ priority }: { priority: string }) => {
  switch (priority) {
    case "high":
      return <Star className="h-4 w-4 text-yellow-500" />
    case "medium":
      return <StarHalf className="h-4 w-4 text-yellow-500" />
    case "low":
      return <StarOff className="h-4 w-4 text-muted-foreground" />
    default:
      return null
  }
}

export default function WishlistPage() {
  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Wishlist</h1>
        <Button>Add to Wishlist</Button>
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
              <SelectItem value="availability">Availability</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mockWishlist.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <div className="aspect-[3/4] relative">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="object-cover w-full h-full"
              />
              <div className="absolute top-2 right-2 bg-background/90 p-1 rounded-full">
                <PriorityIcon priority={item.priority} />
              </div>
            </div>
            <CardHeader>
              <CardTitle className="text-lg">{item.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <div className="text-sm text-muted-foreground">
                  {item.set}
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm">Max Price:</div>
                  <div className="font-medium">
                    ${item.maxPrice.toLocaleString()}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm">Current Price:</div>
                  <div className={`font-medium ${
                    item.currentPrice > item.maxPrice 
                      ? "text-red-500" 
                      : "text-green-500"
                  }`}>
                    ${item.currentPrice.toLocaleString()}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {item.availableNearby} available nearby
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled={item.currentPrice > item.maxPrice}
                >
                  {item.currentPrice > item.maxPrice 
                    ? "Above Max Price" 
                    : "Find Sellers"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 