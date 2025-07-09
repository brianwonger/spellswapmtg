'use client'

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserCard, Container } from "@/lib/types"
import { useEffect, useMemo, useState } from "react"
import { PlusCircle, Trash2 } from "lucide-react"

interface EditCardDialogProps {
  card: UserCard
  containers: Container[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateCard: (cardId: string, updates: {
    quantity: number
    condition: string
    foil: boolean
    notes: string | null
    is_for_sale: boolean
    sale_price: number | null
  }) => Promise<boolean>
  onUpdateContainerItems: (userCardId: string, updates: { container_id: string; quantity: number }[]) => Promise<boolean>
}

export function EditCardDialog({ card, containers, open, onOpenChange, onUpdateCard, onUpdateContainerItems }: EditCardDialogProps) {
  const [quantity, setQuantity] = useState(card.quantity)
  const [condition, setCondition] = useState(card.condition)
  const [foil, setFoil] = useState(card.foil)
  const [notes, setNotes] = useState(card.notes || '')
  const [isForSale, setIsForSale] = useState(card.is_for_sale)
  const [salePrice, setSalePrice] = useState(card.sale_price?.toString() || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [containerQuantities, setContainerQuantities] = useState<Record<string, number>>({})
  const [newContainerId, setNewContainerId] = useState<string>('')

  useEffect(() => {
    if (card.container_items) {
      const initialQuantities = card.container_items.reduce((acc, item) => {
        acc[item.container_id] = item.quantity
        return acc
      }, {} as Record<string, number>)
      setContainerQuantities(initialQuantities)
    }
  }, [card.container_items])

  const assignedQuantity = useMemo(() => {
    return Object.values(containerQuantities).reduce((sum, q) => sum + q, 0)
  }, [containerQuantities])

  const unassignedQuantity = quantity - assignedQuantity

  const otherContainers = useMemo(() => {
    return containers.filter(c => !containerQuantities.hasOwnProperty(c.id))
  }, [containers, containerQuantities])

  const handleContainerQuantityChange = (containerId: string, newQuantity: number) => {
    const newTotalAssigned = assignedQuantity - (containerQuantities[containerId] || 0) + newQuantity
    if (newTotalAssigned > quantity) {
      alert(`Total quantity in containers cannot exceed card quantity (${quantity}).`)
      return
    }
    if (newQuantity > 0) {
      setContainerQuantities(prev => ({ ...prev, [containerId]: newQuantity }))
    } else {
      handleRemoveFromContainer(containerId)
    }
  }
  
  const handleRemoveFromContainer = (containerId: string) => {
    setContainerQuantities(prev => {
      const newQuantities = { ...prev }
      delete newQuantities[containerId]
      return newQuantities
    })
  }

  const handleAddToContainer = () => {
    if (!newContainerId) return
    const addQuantity = Math.max(1, unassignedQuantity > 0 ? 1 : 0)
    if (addQuantity > 0) {
      handleContainerQuantityChange(newContainerId, addQuantity)
      setNewContainerId('')
    } else {
      alert("No unassigned quantity to add to a new container.")
    }
  }

  const handleSubmit = async () => {
    if (quantity < assignedQuantity) {
      alert(`The total quantity (${quantity}) cannot be less than the assigned quantity in containers (${assignedQuantity}). Please adjust quantities before saving.`);
      return;
    }

    setIsSubmitting(true)
    try {
      const cardUpdatesSuccess = await onUpdateCard(card.id, {
        quantity,
        condition,
        foil,
        notes: notes || null,
        is_for_sale: isForSale,
        sale_price: isForSale && salePrice ? parseFloat(salePrice) : null
      })

      const containerUpdates = Object.entries(containerQuantities).map(([container_id, quantity]) => ({
        container_id,
        quantity
      }))
      const containerUpdatesSuccess = await onUpdateContainerItems(card.id, containerUpdates)

      if (cardUpdatesSuccess && containerUpdatesSuccess) {
        onOpenChange(false)
      } else {
        alert("Failed to save all changes. Please check the console for errors.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Card Details - {card.default_cards.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          {/* Card Details */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value)))}
              min={1}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="condition" className="text-right">
              Condition
            </Label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger className="col-span-3">
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
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="foil" className="text-right">
              Foil
            </Label>
            <Select value={foil ? "true" : "false"} onValueChange={(value) => setFoil(value === "true")}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Is foil?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notes
            </Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isForSale" className="text-right">
              For Sale
            </Label>
            <Select value={isForSale ? "true" : "false"} onValueChange={(value) => setIsForSale(value === "true")}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Mark for sale?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isForSale && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="salePrice" className="text-right">
                Sale Price
              </Label>
              <Input
                id="salePrice"
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                min={0}
                step={0.01}
                className="col-span-3"
              />
            </div>
          )}

          {/* Container Management Section */}
          <div className="pt-4 border-t">
            <h3 className="text-lg font-medium mb-4">Container Assignments</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-muted/50 p-2 rounded-md">
                  <Label>Total Quantity</Label>
                  <span className="font-bold">{quantity}</span>
              </div>
              <div className="flex justify-between items-center bg-muted/50 p-2 rounded-md">
                  <Label>Unassigned Quantity</Label>
                  <span className="font-bold text-blue-600">{unassignedQuantity}</span>
              </div>
              
              {Object.entries(containerQuantities).map(([containerId, qty]) => {
                const container = containers.find(c => c.id === containerId)
                if (!container) return null
                return (
                  <div key={containerId} className="grid grid-cols-4 items-center gap-4">
                    <Label className="col-span-2">{container.name}</Label>
                    <Input 
                      type="number"
                      value={qty}
                      onChange={e => handleContainerQuantityChange(containerId, parseInt(e.target.value))}
                      min={0}
                      className="col-span-1"
                    />
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveFromContainer(containerId)} className="col-span-1 justify-self-start">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}

              {otherContainers.length > 0 && (
                <div className="grid grid-cols-4 items-center gap-4 pt-4 border-t">
                  <div className="col-span-3">
                    <Select value={newContainerId} onValueChange={setNewContainerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add to another container..." />
                      </SelectTrigger>
                      <SelectContent>
                        {otherContainers.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddToContainer} disabled={!newContainerId || unassignedQuantity <= 0}>
                    <PlusCircle className="h-4 w-4 mr-2" /> Add
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 