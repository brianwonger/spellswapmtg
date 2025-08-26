'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertTriangle, X } from "lucide-react"

interface CancelTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => Promise<void>
  transactionId: string
  description?: string
}

export function CancelTransactionDialog({
  open,
  onOpenChange,
  onConfirm,
  transactionId,
  description = "Are you sure you want to cancel this transaction? The other party will be notified."
}: CancelTransactionDialogProps) {
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for cancellation')
      return
    }

    if (reason.trim().length > 1000) {
      setError('Cancellation reason must be less than 1000 characters')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await onConfirm(reason.trim())
      setReason('')
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel transaction')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setReason('')
    setError('')
    onOpenChange(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when dialog closes
      setReason('')
      setError('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-red-600">Cancel Transaction</DialogTitle>
              <DialogDescription>
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Cancellation Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Please explain why you're cancelling this transaction..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (error) setError('')
              }}
              className="min-h-[100px] resize-none"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              {reason.length}/1000 characters
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              <X className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Cancelling an accepted transaction will notify the seller and may affect your reputation. Please provide a clear reason for the cancellation.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Keep Transaction
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Cancelling...
              </>
            ) : (
              'Cancel Transaction'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
