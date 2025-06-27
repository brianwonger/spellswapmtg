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
import { Search, Filter } from "lucide-react"

// Mock data for initial development
const mockCards = [
  {
    id: 1,
    name: "Black Lotus",
    set: "Alpha",
    condition: "Near Mint",
    price: 50000,
    imageUrl: "https://placehold.co/300x400",
  },
  {
    id: 2,
    name: "Time Walk",
    set: "Beta",
    condition: "Lightly Played",
    price: 15000,
    imageUrl: "https://placehold.co/300x400",
  },
  // Add more mock cards as needed
]

export default function CollectionPage() {
  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Collection</h1>
        <Button>Import Cards</Button>
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
        {mockCards.map((card) => (
          <Card key={card.id} className="overflow-hidden">
            <div className="aspect-[3/4] relative">
              <img
                src={card.imageUrl}
                alt={card.name}
                className="object-cover w-full h-full"
              />
            </div>
            <CardHeader>
              <CardTitle className="text-lg">{card.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-1">
                <div className="text-sm text-muted-foreground">
                  {card.set} • {card.condition}
                </div>
                <div className="font-medium">
                  ${card.price.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 