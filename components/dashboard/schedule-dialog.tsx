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
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarIcon, Upload, Check, Copy, Mail, Plus, X, Clock, AlertCircle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { WhatsAppIcon } from '@/components/icons/whatsapp-icon'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ScheduleDialogProps {
  quizId: string
  quizTitle: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CompletedSessionInfo {
  joinUrl: string
  roomCode: string
  invitedCount: number
  emailsSentCount: number
  scheduledAt: string
  timezone: string
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
  const [emails, setEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [completedInfo, setCompletedInfo] = useState<CompletedSessionInfo | null>(null)
  const [copied, setCopied] = useState(false)

  // Helper to extract and add valid emails from any string (comma, space, newline separated)
  const addEmails = (rawText: string): number => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const matches = rawText.match(emailRegex) || []
    if (matches.length === 0) return 0

    const clean = matches.map((m) => m.toLowerCase().trim())
    let addedCount = 0
    setEmails((prev) => {
      const existingSet = new Set(prev)
      const next = [...prev]
      for (const email of clean) {
        if (!existingSet.has(email)) {
          existingSet.add(email)
          next.push(email)
          addedCount++
        }
      }
      return next
    })
    return addedCount
  }

  const handleAddEmailFromInput = () => {
    if (!emailInput.trim()) return
    const added = addEmails(emailInput)
    if (added > 0) {
      setEmailInput('')
    } else {
      toast.error('Please enter a valid email address')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ' || e.key === 'Tab') {
      if (emailInput.trim()) {
        e.preventDefault()
        handleAddEmailFromInput()
      }
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (text && text.includes('@')) {
      e.preventDefault()
      const added = addEmails(text)
      setEmailInput('')
      if (added > 0) {
        toast.success(`Added ${added} email address${added > 1 ? 'es' : ''}`)
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    // If user typed/pasted a string with separators (space, comma, newline) containing an email, auto-add
    if (/[,;\s\n]/.test(val) && val.includes('@')) {
      const added = addEmails(val)
      if (added > 0) {
        setEmailInput('')
        return
      }
    }
    setEmailInput(val)
  }

  const handleRemoveEmail = (target: string) => {
    setEmails((prev) => prev.filter((e) => e !== target))
  }

  const handleClearAll = () => {
    setEmails([])
    setEmailInput('')
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        const added = addEmails(content)
        toast.success(`Imported ${added} email(s) from CSV`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
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

      // Include pending text in input if valid email
      const allEmails = [...emails]
      if (emailInput.trim()) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        const trimmed = emailInput.trim().toLowerCase()
        if (emailRegex.test(trimmed) && !allEmails.includes(trimmed)) {
          allEmails.push(trimmed)
        }
      }

      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId,
          scheduledAt: scheduledDate.toISOString(),
          timezone,
          emails: allEmails,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule session')
      }

      const sentCount = data.emailsSentCount ?? (data.emailResults ? data.emailResults.filter((r: { success: boolean }) => r.success).length : allEmails.length)

      setCompletedInfo({
        joinUrl: data.joinUrl,
        roomCode: data.roomCode,
        invitedCount: allEmails.length,
        emailsSentCount: sentCount,
        scheduledAt: scheduledDate.toISOString(),
        timezone,
      })

      if (allEmails.length > 0) {
        if (sentCount === allEmails.length) {
          toast.success(`Session scheduled! Sent ${sentCount} invite email(s).`)
        } else {
          toast.warning(`Session scheduled, but only ${sentCount}/${allEmails.length} emails could be delivered.`)
        }
      } else {
        toast.success('Session scheduled successfully!')
      }
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
    setEmails([])
    setEmailInput('')
    onOpenChange(false)
  }

  const formattedScheduledTime = completedInfo
    ? new Date(completedInfo.scheduledAt).toLocaleString(undefined, {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: completedInfo.timezone,
      })
    : ''

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Quiz Session</DialogTitle>
          <DialogDescription>
            Schedule &ldquo;{quizTitle}&rdquo; and automatically email invites with calendar attachments.
          </DialogDescription>
        </DialogHeader>

        {completedInfo ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500" /> Session Confirmed!
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  ROOM: {completedInfo.roomCode}
                </span>
              </div>

              {/* Scheduled Time Banner */}
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background border border-border/70 text-xs">
                <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-foreground">{formattedScheduledTime}</div>
                  <div className="text-[11px] text-muted-foreground">Timezone: {completedInfo.timezone}</div>
                </div>
              </div>

              {completedInfo.invitedCount > 0 && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  <span>
                    Invited {completedInfo.invitedCount} participant(s)
                    {completedInfo.emailsSentCount < completedInfo.invitedCount
                      ? ` (${completedInfo.emailsSentCount} delivered)`
                      : ' (invites dispatched)'}
                  </span>
                </div>
              )}
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center p-3 bg-muted/20 border rounded-xl gap-2">
              <div className="bg-white p-2.5 rounded-xl shadow-xs border">
                <QRCodeSVG value={completedInfo.joinUrl} size={130} />
              </div>
              <div className="text-[11px] text-muted-foreground text-center">
                Scan with phone camera to join
              </div>
            </div>

            {/* Public Link */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Public Join Link</Label>
              <div className="flex gap-2">
                <Input value={completedInfo.joinUrl} readOnly className="font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={handleCopyLink} title="Copy Link">
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Quick Share Buttons with Scheduled Time */}
            <div className="flex gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Join my scheduled quiz "${quizTitle}" on Huddle! 🚀\n\n📅 Date & Time: ${formattedScheduledTime} (${completedInfo.timezone})\n🔑 Room Code: ${completedInfo.roomCode}\n🔗 Direct Link: ${completedInfo.joinUrl}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'flex-1 gap-1.5 text-xs font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer'
                )}
              >
                <WhatsAppIcon className="h-3.5 w-3.5 fill-current" />
                <span>WhatsApp</span>
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(
                  `Invitation to quiz: ${quizTitle}`
                )}&body=${encodeURIComponent(
                  `Hi,\n\nYou're invited to join my quiz "${quizTitle}" on Huddle!\n\n📅 Scheduled: ${formattedScheduledTime} (${completedInfo.timezone})\n🔑 Room Code: ${completedInfo.roomCode}\n🔗 Direct Link: ${completedInfo.joinUrl}\n\nSee you there!`
                )}`}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'flex-1 gap-1.5 text-xs font-semibold hover:bg-muted cursor-pointer'
                )}
              >
                <Mail className="h-3.5 w-3.5 text-primary" />
                <span>Email</span>
              </a>
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
                <Label className="text-xs font-medium">Date</Label>
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
                <Label className="text-xs font-medium">Time</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Timezone</Label>
              <Select
                value={timezone}
                onValueChange={(val) => {
                  if (val) setTimezone(val)
                }}
              >
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

            {/* Email Recipients (Chip / Tag Input with Paste & Space/Comma Support) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">
                  Invite Emails {emails.length > 0 && <span className="text-primary font-bold">({emails.length})</span>}
                </Label>
                <label className="cursor-pointer text-xs text-primary hover:underline flex items-center gap-1 font-medium">
                  <Upload className="h-3 w-3" /> Upload CSV
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleCsvUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Type email & press Enter, or paste separated by space / comma..."
                  value={emailInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  className="text-xs flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddEmailFromInput}
                  disabled={!emailInput.trim()}
                  className="text-xs shrink-0 gap-1 px-3"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>

              {/* Email Chips Container */}
              {emails.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2.5 rounded-lg bg-muted/40 border border-border/60">
                    {emails.map((email) => (
                      <Badge
                        key={email}
                        variant="secondary"
                        className="gap-1.5 pl-2.5 pr-1 py-1 text-xs font-normal rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors"
                      >
                        <span className="truncate max-w-[200px]">{email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail(email)}
                          className="rounded-full hover:bg-primary/20 p-0.5 text-primary/70 hover:text-primary transition-colors cursor-pointer"
                          title={`Remove ${email}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
                    <span>{emails.length} recipient(s) will receive an email invite</span>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-destructive hover:underline cursor-pointer font-medium"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Press <strong>Enter</strong>, <strong>comma</strong>, or <strong>space</strong> after each email, or paste multiple emails at once.
                </p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSchedule} disabled={loading}>
                {loading ? 'Scheduling...' : emails.length > 0 ? `Schedule & Invite (${emails.length})` : 'Schedule Session'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
