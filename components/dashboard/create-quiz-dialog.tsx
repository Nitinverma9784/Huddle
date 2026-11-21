'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sparkles, FileUp, PenTool, Loader2, PlusCircle, AlertCircle } from 'lucide-react'
import { createQuiz } from '@/app/dashboard/quizzes/actions'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

export function CreateQuizDialog({ children }: { children?: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('prompt')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // AI Prompt State
  const [topic, setTopic] = useState('')
  const [questionCount, setQuestionCount] = useState('5')
  const [difficulty, setDifficulty] = useState('medium')
  const [questionType, setQuestionType] = useState('mcq')

  // File Upload State
  const [file, setFile] = useState<File | null>(null)

  // Manual State
  const [manualTitle, setManualTitle] = useState('')
  const [manualDesc, setManualDesc] = useState('')

  const handleCreateManual = async () => {
    if (!manualTitle.trim()) {
      toast.error('Quiz title is required')
      return
    }

    try {
      setLoading(true)
      setErrorMessage(null)
      const newQuiz = await createQuiz({
        title: manualTitle.trim(),
        description: manualDesc.trim(),
        source_type: 'manual',
        theme: 'default',
        default_timer_seconds: 20,
        default_points: 1000,
      })
      toast.success('Quiz created!')
      setOpen(false)
      router.push(`/dashboard/quizzes/${newQuiz.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create quiz'
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateFromPrompt = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a topic or subject description')
      return
    }

    try {
      setLoading(true)
      setErrorMessage(null)
      const res = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          question_count: parseInt(questionCount, 10),
          difficulty,
          question_type: questionType,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate quiz')
      }

      toast.success(`Generated ${data.questionCount} questions using AI (${data.provider})!`)
      setOpen(false)
      router.push(`/dashboard/quizzes/${data.quizId}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI generation failed'
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateFromFile = async () => {
    if (!file) {
      toast.error('Please select a file to upload')
      return
    }

    try {
      setLoading(true)
      setErrorMessage(null)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('topic', topic.trim() || file.name)
      formData.append('question_count', questionCount)
      formData.append('difficulty', difficulty)
      formData.append('question_type', questionType)

      const res = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract file and generate questions')
      }

      if (data.warning) {
        toast.warning(data.warning)
      } else {
        toast.success(`Quiz generated from document!`)
      }

      setOpen(false)
      router.push(`/dashboard/quizzes/${data.quizId}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'File generation failed'
      setErrorMessage(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants(), 'gap-2 cursor-pointer')}>
        {children || (
          <>
            <PlusCircle className="h-4 w-4" /> Create Quiz
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Create a New Quiz</DialogTitle>
          <DialogDescription>
            Generate instantly with AI or craft your questions manually.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <Alert variant="destructive" className="my-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Generation Error</AlertTitle>
            <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="pt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="prompt" className="gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" /> AI Prompt
            </TabsTrigger>
            <TabsTrigger value="file" className="gap-1.5 text-xs">
              <FileUp className="h-3.5 w-3.5" /> From File
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-1.5 text-xs">
              <PenTool className="h-3.5 w-3.5" /> Manual
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: AI PROMPT */}
          <TabsContent value="prompt" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Topic or Concept</Label>
              <Textarea
                placeholder="e.g. World War II European Theater, React hooks and performance, Biology cell mitosis..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="text-sm min-h-[75px]"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Questions</Label>
                <Select value={questionCount} onValueChange={(val) => { if (val) setQuestionCount(val) }}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Difficulty</Label>
                <Select value={difficulty} onValueChange={(val) => { if (val) setDifficulty(val) }}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={questionType} onValueChange={(val) => { if (val) setQuestionType(val) }}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">MCQ</SelectItem>
                    <SelectItem value="true_false">True/False</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerateFromPrompt}
              disabled={loading}
              className="w-full gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating Quiz...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate with AI
                </>
              )}
            </Button>
          </TabsContent>

          {/* TAB 2: FROM FILE */}
          <TabsContent value="file" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Upload Document (PDF, DOCX, PPTX, TXT - max 20MB)</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 cursor-pointer transition-colors relative">
                <input
                  type="file"
                  accept=".pdf,.docx,.pptx,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <div className="text-xs font-medium">
                  {file ? file.name : 'Click to select or drag and drop file'}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'PDF, Word, PowerPoint, or Text'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Questions</Label>
                <Select value={questionCount} onValueChange={(val) => { if (val) setQuestionCount(val) }}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Difficulty</Label>
                <Select value={difficulty} onValueChange={(val) => { if (val) setDifficulty(val) }}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={questionType} onValueChange={(val) => { if (val) setQuestionType(val) }}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mcq">MCQ</SelectItem>
                    <SelectItem value="true_false">True/False</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerateFromFile}
              disabled={loading || !file}
              className="w-full gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Extracting & Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Extract & Build Quiz
                </>
              )}
            </Button>
          </TabsContent>

          {/* TAB 3: MANUAL BUILDER */}
          <TabsContent value="manual" className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Quiz Title</Label>
              <Input
                placeholder="e.g. Weekly Team Trivia #4"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description (Optional)</Label>
              <Textarea
                placeholder="Brief intro for your participants..."
                value={manualDesc}
                onChange={(e) => setManualDesc(e.target.value)}
                className="text-sm min-h-[60px]"
              />
            </div>

            <Button
              onClick={handleCreateManual}
              disabled={loading || !manualTitle.trim()}
              className="w-full gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <PenTool className="h-4 w-4" /> Open Quiz Editor
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
