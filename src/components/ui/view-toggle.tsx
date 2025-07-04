'use client'

import { LayoutGrid, List } from "lucide-react"
import { Button } from "./button"
import { useState } from "react"

export type ViewMode = 'grid' | 'list'

interface ViewToggleProps {
  onViewChange: (mode: ViewMode) => void
  currentView: ViewMode
}

export function ViewToggle({ onViewChange, currentView }: ViewToggleProps) {
  return (
    <div className="flex gap-1 border rounded-md">
      <Button
        variant={currentView === 'grid' ? 'default' : 'ghost'}
        size="icon"
        onClick={() => onViewChange('grid')}
        className="rounded-none"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={currentView === 'list' ? 'default' : 'ghost'}
        size="icon"
        onClick={() => onViewChange('list')}
        className="rounded-none"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  )
} 