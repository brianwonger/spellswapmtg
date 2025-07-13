'use client'

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Filter } from "lucide-react"

export type WishlistFilters = {
  cardType: string
  rarity: string
  setName: string
  priority: string
  foilPreference: string
  condition: string
  priceMin: string
  priceMax: string
  dateRange: string
  withinBudget: string
}

const defaultFilters: WishlistFilters = {
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
}

interface FilterDialogProps {
  onFiltersChange: (filters: WishlistFilters) => void
}

export function FilterDialog({ onFiltersChange }: FilterDialogProps) {
  const [filters, setFilters] = useState<WishlistFilters>(defaultFilters)

  const handleFilterChange = (key: keyof WishlistFilters, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearFilters = () => {
    setFilters(defaultFilters)
    onFiltersChange(defaultFilters)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Filter Wishlist</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card Type */}
            <div className="space-y-2">
              <Label>Card Type</Label>
              <Select
                value={filters.cardType}
                onValueChange={(value) => handleFilterChange("cardType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select card type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="creature">Creature</SelectItem>
                  <SelectItem value="instant">Instant</SelectItem>
                  <SelectItem value="sorcery">Sorcery</SelectItem>
                  <SelectItem value="artifact">Artifact</SelectItem>
                  <SelectItem value="enchantment">Enchantment</SelectItem>
                  <SelectItem value="planeswalker">Planeswalker</SelectItem>
                  <SelectItem value="land">Land</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rarity */}
            <div className="space-y-2">
              <Label>Rarity</Label>
              <Select
                value={filters.rarity}
                onValueChange={(value) => handleFilterChange("rarity", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select rarity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rarities</SelectItem>
                  <SelectItem value="common">Common</SelectItem>
                  <SelectItem value="uncommon">Uncommon</SelectItem>
                  <SelectItem value="rare">Rare</SelectItem>
                  <SelectItem value="mythic">Mythic Rare</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={filters.priority}
                onValueChange={(value) => handleFilterChange("priority", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Foil Preference */}
            <div className="space-y-2">
              <Label>Foil Preference</Label>
              <Select
                value={filters.foilPreference}
                onValueChange={(value) => handleFilterChange("foilPreference", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select foil preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any</SelectItem>
                  <SelectItem value="yes">Foil Only</SelectItem>
                  <SelectItem value="no">Non-Foil Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Condition */}
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select
                value={filters.condition}
                onValueChange={(value) => handleFilterChange("condition", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Condition</SelectItem>
                  <SelectItem value="NM">Near Mint</SelectItem>
                  <SelectItem value="LP">Lightly Played</SelectItem>
                  <SelectItem value="MP">Moderately Played</SelectItem>
                  <SelectItem value="HP">Heavily Played</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Within Budget */}
            <div className="space-y-2">
              <Label>Budget Status</Label>
              <Select
                value={filters.withinBudget}
                onValueChange={(value) => handleFilterChange("withinBudget", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select budget status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cards</SelectItem>
                  <SelectItem value="within">Within Budget</SelectItem>
                  <SelectItem value="over">Over Budget</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <div className="space-y-2 col-span-full">
              <Label>Price Range ($)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.priceMin}
                  onChange={(e) => handleFilterChange("priceMin", e.target.value)}
                  className="w-full"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.priceMax}
                  onChange={(e) => handleFilterChange("priceMax", e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2 col-span-full">
              <Label>Added to Wishlist</Label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => handleFilterChange("dateRange", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
            <DialogTrigger asChild>
              <Button>Apply Filters</Button>
            </DialogTrigger>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 