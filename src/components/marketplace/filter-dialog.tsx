'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Filter } from 'lucide-react'

const COLOR_MAP = {
  'White': 'W',
  'Blue': 'U',
  'Black': 'B',
  'Red': 'R',
  'Green': 'G',
  'Colorless': 'C'
} as const

const COLORS = ['White', 'Blue', 'Black', 'Red', 'Green', 'Colorless'] as const
const FORMATS = ['Standard', 'Modern', 'Commander', 'Pioneer', 'Legacy', 'Vintage']
const RARITIES = ['Common', 'Uncommon', 'Rare', 'Mythic']
const MANA_COSTS = ['0', '1', '2', '3', '4', '5', '6+']

interface FilterDialogProps {
  onFiltersChange: (filters: any) => void;
}

const initialFilterState = {
  colors: [] as string[],
  manaCosts: [] as string[],
  format: "",
  setName: "",
  rarity: [] as string[],
  priceRange: {
    min: "",
    max: "",
  },
};

export function FilterDialog({ onFiltersChange }: FilterDialogProps) {
  const [filters, setFilters] = useState(initialFilterState);

  const handleColorToggle = (color: keyof typeof COLOR_MAP) => {
    const colorCode = COLOR_MAP[color]
    setFilters(prev => ({
      ...prev,
      colors: prev.colors.includes(colorCode)
        ? prev.colors.filter(c => c !== colorCode)
        : [...prev.colors, colorCode]
    }))
  }

  const handleManaCostToggle = (cost: string) => {
    setFilters(prev => ({
      ...prev,
      manaCosts: prev.manaCosts.includes(cost)
        ? prev.manaCosts.filter(c => c !== cost)
        : [...prev.manaCosts, cost]
    }))
  }

  const handleFormatToggle = (format: string) => {
    setFilters(prev => ({
      ...prev,
      format: prev.format === format ? '' : format
    }))
  }

  const handleRarityToggle = (rarity: string) => {
    setFilters(prev => ({
      ...prev,
      rarity: prev.rarity.includes(rarity)
        ? prev.rarity.filter(r => r !== rarity)
        : [...prev.rarity, rarity]
    }))
  }

  const handleApplyFilters = () => {
    onFiltersChange(filters);
  };

  const handleClearFilters = () => {
    setFilters(initialFilterState);
    onFiltersChange(initialFilterState);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Filter Cards</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label>Colors</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(color => (
                <Button
                  key={color}
                  variant={filters.colors.includes(COLOR_MAP[color]) ? "default" : "outline"}
                  onClick={() => handleColorToggle(color)}
                  className="h-8"
                >
                  {color}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mana Cost</Label>
            <div className="flex flex-wrap gap-2">
              {MANA_COSTS.map(cost => (
                <Button
                  key={cost}
                  variant={filters.manaCosts.includes(cost) ? "default" : "outline"}
                  onClick={() => handleManaCostToggle(cost)}
                  className="h-8 w-8"
                >
                  {cost}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Format</Label>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map(format => (
                <Button
                  key={format}
                  variant={filters.format === format ? "default" : "outline"}
                  onClick={() => handleFormatToggle(format)}
                  className="h-8"
                >
                  {format}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Set Name</Label>
            <Input
              placeholder="Enter set name..."
              value={filters.setName}
              onChange={(e) => setFilters(prev => ({ ...prev, setName: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Rarity</Label>
            <div className="flex flex-wrap gap-2">
              {RARITIES.map(rarity => (
                <Button
                  key={rarity}
                  variant={filters.rarity.includes(rarity) ? "default" : "outline"}
                  onClick={() => handleRarityToggle(rarity)}
                  className="h-8"
                >
                  {rarity}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Price Range</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={filters.priceRange.min}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    priceRange: { ...prev.priceRange, min: e.target.value },
                  }))
                }
              />
              <Input
                type="number"
                placeholder="Max"
                value={filters.priceRange.max}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    priceRange: { ...prev.priceRange, max: e.target.value },
                  }))
                }
              />
            </div>
          </div>
        </div>
        <div className="flex w-full items-center gap-2 pt-4">
          <Button onClick={handleApplyFilters} className="w-1/2">
            Apply Filters
          </Button>
          <Button
            onClick={handleClearFilters}
            variant="secondary"
            className="w-1/2"
          >
            Clear All
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 