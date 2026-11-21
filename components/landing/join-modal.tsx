'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface JoinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function JoinModal({ open, onOpenChange }: JoinModalProps) {
  const router = useRouter()
  const [code, setCode] = useState('')

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = code.trim().toUpperCase()
    if (!cleaned) {
      toast.error('Please enter a room code')
      return
    }
    onOpenChange(false)
    router.push(`/room/${cleaned}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-purple-500/20 shadow-2xl">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto flex items-center justify-center mb-3">
            <img
              src="/huddle-logo.png"
              alt="Huddle"
              className="h-10 w-auto object-contain select-none"
            />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">Enter Game Pin</DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Type the 6-character room code from your host to enter the live game.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleJoin} className="space-y-4 pt-2">
          <Input
            placeholder="ROOM CODE (e.g. 7K9X2)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            className="font-mono text-center text-xl font-black tracking-widest uppercase h-14 bg-background/50 border-purple-500/30 focus-visible:ring-purple-500"
            autoFocus
          />
          <Button
            type="submit"
            size="lg"
            className="w-full h-12 text-base font-bold bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-lg shadow-purple-600/30 gap-2"
          >
            Join Live Game <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
