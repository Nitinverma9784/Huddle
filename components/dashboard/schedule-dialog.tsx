'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarIcon, Upload, Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { scheduleSessionWithInvites } from '@/app/dashboard/sessions/schedule-action'
import { toast } from 'sonner'

interface ScheduleDialogProps {
  quizId: string
  quizTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ScheduleDialog({
  quizId,
  quizTitle,
  open,
  onOpenChange,
}: ScheduleDialogProps) {
  const [date, setDate] = useState<Date | undefined>(() => new Date(Date.now() + 86400000))
  const [time, setTime] = useState('18:00')
  const [timezone, setTimezone] = useState(
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
  )
  const [emailsText, setEmailsText] = useState('')
  const [loading, setLoading] = useState(false)
  const [completedInfo, setCompletedInfo] = useState<{
    joinUrl: string
    roomCode: string
    invitedCount: number
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        // Simple regex to extract emails from CSV
        const extracted = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []
        const currentList = emailsText.split('\n').filter(Boolean)
        const combined = Array.from(new Set([...currentList, ...extracted]))
        setEmailsText(combined.join('\n'))
        toast.success(`Imported ${extracted.length} emails from CSV`)
      }
    }
    reader.readAsText(file)
  }

  const handleSchedule = async () => {
    if (!date) {
      toast.error('Please pick a date')
      return
    }

    try {
      setLoading(true)
      const [hours, minutes] = time.split(':').map(Number)
      const scheduledDate = new Date(date)
      scheduledDate.setHours(hours || 0, minutes || 0, 0, 0)

      const emails = emailsText
        .split(/[\n,;]+/)
        .map((e) => e.trim())
        .filter(Boolean)

      const res = await scheduleSessionWithInvites({
        quizId,
        scheduledAt: scheduledDate.toISOString(),
        timezone,
        emails,
      })

      setCompletedInfo(res)
      toast.success('Session scheduled successfully!')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (completedInfo?.joinUrl) {
      navigator.clipboard.writeText(completedInfo.joinUrl)
      setCopied(true)
      toast.success('Join link copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setCompletedInfo(null)
    setEmailsText('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Quiz Session</DialogTitle>
          <DialogDescription>
            Schedule &ldquo;{quizTitle}&rdquo; and automatically email invites with calendar attachments.
          </DialogDescription>
        </DialogHeader>

        {completedInfo ? (
          <div className="space-y-4 py-3">
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
              <div className="text-sm font-semibold text-foreground">Session Confirmed!</div>
              <div className="text-xs text-muted-foreground">
                Room Code: <span className="font-mono font-bold text-foreground">{completedInfo.roomCode}</span>
              </div>
              {completedInfo.invitedCount > 0 && (
                <div className="text-xs text-muted-foreground">
                  Invites sent to {completedInfo.invitedCount} participant(s).
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Public Join Link</Label>
              <div className="flex gap-2">
                <Input value={completedInfo.joinUrl} readOnly className="font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={handleCopyLink}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Popover>
                  <PopoverTrigger
                    className={cn(
                      buttonVariants({ variant: 'outline' }),
                      'w-full justify-start text-left font-normal text-xs'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {date ? date.toLocaleDateString() : 'Pick date'}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Time</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Timezone</Label>
              <Select value={timezone} onValueChange={(val) => { if (val) setTimezone(val) }}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time (US)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (US)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (US)</SelectItem>
                  <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                  <SelectItem value="Europe/Paris">Central European Time</SelectItem>
                  <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Japan (JST)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Invite Emails (optional)</Label>
                <label className="cursor-pointer text-xs text-primary hover:underline flex items-center gap-1">
                  <Upload className="h-3 w-3" /> Upload CSV
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleCsvUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <Textarea
                placeholder="Enter emails separated by comma or new lines..."
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
                className="text-xs min-h-[90px]"
              />
              <p className="text-[11px] text-muted-foreground">
                Invitees will receive an email with quiz details and a .ics calendar invite.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSchedule} disabled={loading}>
                {loading ? 'Scheduling...' : 'Schedule & Invite'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
