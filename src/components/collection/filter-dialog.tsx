'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Filter } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

export type CardFilters = {
  colors: string[]
  type: string | null
  rarity: string | null
  set: string | null
  minPrice: number | null
  maxPrice: number | null
  condition: string | null
  foil: boolean | null
  saleStatus: string | null
}

interface FilterDialogProps {
  filters: CardFilters
  onFiltersChange: (filters: CardFilters) => void
}

export function FilterDialog({ filters, onFiltersChange }: FilterDialogProps) {
  const updateFilter = (key: keyof CardFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'any' ? null : value
    })
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Filter Cards</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Sale Status */}
          <div className="grid gap-2">
            <Label htmlFor="saleStatus">Sale Status</Label>
            <Select
              value={filters.saleStatus || 'any'}
              onValueChange={(value) => updateFilter('saleStatus', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All Cards</SelectItem>
                <SelectItem value="for_sale">For Sale Only</SelectItem>
                <SelectItem value="not_for_sale">Not For Sale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Card Type */}
          <div className="grid gap-2">
            <Label htmlFor="type">Card Type</Label>
            <Select
              value={filters.type || 'any'}
              onValueChange={(value) => updateFilter('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Type</SelectItem>
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
          <div className="grid gap-2">
            <Label htmlFor="rarity">Rarity</Label>
            <Select
              value={filters.rarity || 'any'}
              onValueChange={(value) => updateFilter('rarity', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rarity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Rarity</SelectItem>
                <SelectItem value="common">Common</SelectItem>
                <SelectItem value="uncommon">Uncommon</SelectItem>
                <SelectItem value="rare">Rare</SelectItem>
                <SelectItem value="mythic">Mythic</SelectItem>
                <SelectItem value="special">Special</SelectItem>
                <SelectItem value="bonus">Bonus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Condition */}
          <div className="grid gap-2">
            <Label htmlFor="condition">Condition</Label>
            <Select
              value={filters.condition || 'any'}
              onValueChange={(value) => updateFilter('condition', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Condition</SelectItem>
                <SelectItem value="near_mint">Near Mint</SelectItem>
                <SelectItem value="lightly_played">Lightly Played</SelectItem>
                <SelectItem value="moderately_played">Moderately Played</SelectItem>
                <SelectItem value="heavily_played">Heavily Played</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div className="grid gap-2">
            <Label>Price Range</Label>
            <div className="flex gap-2">
              <div className="grid gap-1.5 flex-1">
                <Label htmlFor="minPrice" className="text-xs">Min ($)</Label>
                <Input
                  type="number"
                  id="minPrice"
                  placeholder="0"
                  value={filters.minPrice || ""}
                  onChange={(e) => updateFilter('minPrice', e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="grid gap-1.5 flex-1">
                <Label htmlFor="maxPrice" className="text-xs">Max ($)</Label>
                <Input
                  type="number"
                  id="maxPrice"
                  placeholder="1000"
                  value={filters.maxPrice || ""}
                  onChange={(e) => updateFilter('maxPrice', e.target.value ? Number(e.target.value) : null)}
                />
              </div>
            </div>
          </div>

          {/* Foil */}
          <div className="grid gap-2">
            <Label htmlFor="foil">Foil</Label>
            <Select
              value={filters.foil === null ? 'any' : filters.foil.toString()}
              onValueChange={(value) => updateFilter('foil', value === 'any' ? null : value === "true")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select foil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Variant</SelectItem>
                <SelectItem value="true">Foil Only</SelectItem>
                <SelectItem value="false">Non-Foil Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 