'use client'

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { WishlistItem } from "@/lib/types"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface EditWishlistDialogProps {
  item: WishlistItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (updatedItem: WishlistItem) => void
}

export function EditWishlistDialog({ 
  item, 
  open, 
  onOpenChange,
  onUpdate 
}: EditWishlistDialogProps) {
  const [priority, setPriority] = useState(item.priority || 'medium')
  const [maxPrice, setMaxPrice] = useState(item.max_price?.toString() || '')
  const [condition, setCondition] = useState(item.preferred_condition || 'near_mint')
  const [foilPreference, setFoilPreference] = useState(item.foil_preference || 'either')
  const [notes, setNotes] = useState(item.notes || '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const updates = {
        priority,
        max_price: maxPrice ? parseFloat(maxPrice) : null,
        preferred_condition: condition,
        foil_preference: foilPreference,
        notes
      }

      const { error } = await supabase
        .from('wishlist_items')
        .update(updates)
        .eq('id', item.id)
        .eq('user_id', user.id)

      if (error) throw error

      onUpdate({
        ...item,
        ...updates
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating wishlist item:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Wishlist Item</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Card Name</Label>
            <p className="text-sm text-muted-foreground">{item.default_cards.name}</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="maxPrice">Maximum Price</Label>
            <Input
              id="maxPrice"
              type="number"
              step="0.01"
              min="0"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Enter maximum price"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="condition">Preferred Condition</Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mint">Mint</SelectItem>
                <SelectItem value="near_mint">Near Mint</SelectItem>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="light_played">Light Played</SelectItem>
                <SelectItem value="moderately_played">Moderately Played</SelectItem>
                <SelectItem value="heavily_played">Heavily Played</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="foilPreference">Foil Preference</Label>
            <Select value={foilPreference} onValueChange={setFoilPreference}>
              <SelectTrigger>
                <SelectValue placeholder="Select foil preference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="foil">Foil Only</SelectItem>
                <SelectItem value="non_foil">Non-Foil Only</SelectItem>
                <SelectItem value="either">Either</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this card..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 