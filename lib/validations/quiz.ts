import { z } from 'zod'

export const DifficultyEnum = z.enum(['easy', 'medium', 'hard', 'mixed'])
export type Difficulty = z.infer<typeof DifficultyEnum>

export const QuestionTypeEnum = z.enum(['mcq', 'true_false', 'mixed'])
export type QuestionType = z.infer<typeof QuestionTypeEnum>

export const QuizThemeEnum = z.enum(['default', 'ocean', 'sunset', 'cyberpunk', 'forest'])
export type QuizTheme = z.infer<typeof QuizThemeEnum>

export const SessionStatusEnum = z.enum(['scheduled', 'lobby', 'live', 'ended', 'cancelled'])
export type SessionStatus = z.infer<typeof SessionStatusEnum>

export const QuestionSchema = z.object({
  id: z.string().uuid().optional(),
  quiz_id: z.string().uuid().optional(),
  text: z.string().min(1, 'Question text cannot be empty'),
  options: z.array(z.string().min(1, 'Option cannot be empty')).min(2, 'At least 2 options required').max(6, 'At most 6 options allowed'),
  correct_index: z.number().int().min(0),
  timer_seconds: z.number().int().min(5).max(120).default(20),
  points: z.number().int().min(0).max(2000).default(1000),
  image_url: z.string().optional().default(''),
  order_index: z.number().int().default(0),
}).refine((data) => data.correct_index < data.options.length, {
  message: 'Correct option index must be within options range',
  path: ['correct_index'],
})

export type Question = z.infer<typeof QuestionSchema>

export const QuizSchema = z.object({
  id: z.string().uuid().optional(),
  owner_id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(500).optional().default(''),
  source_type: z.enum(['manual', 'prompt', 'file']).default('manual'),
  theme: QuizThemeEnum.default('default'),
  cover_image_url: z.string().optional().default(''),
  default_timer_seconds: z.number().int().min(5).max(120).default(20),
  default_points: z.number().int().min(100).max(2000).default(1000),
  questions: z.array(QuestionSchema).optional().default([]),
})

export type Quiz = z.infer<typeof QuizSchema>

export const AIGenerateRequestSchema = z.object({
  topic: z.string().min(3, 'Topic or content must be at least 3 characters'),
  question_count: z.number().int().min(1).max(20).default(5),
  difficulty: DifficultyEnum.default('medium'),
  question_type: QuestionTypeEnum.default('mcq'),
})

export type AIGenerateRequest = z.infer<typeof AIGenerateRequestSchema>

export const AIGeneratedQuestionSchema = z.object({
  text: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(6),
  correct_index: z.number().int().min(0),
  explanation: z.string().optional().default(''),
}).refine((data) => data.correct_index < data.options.length, {
  message: 'Correct index must be within options range',
  path: ['correct_index'],
})

export const AIGenerateResponseSchema = z.object({
  title: z.string().optional().default('AI Generated Quiz'),
  questions: z.array(AIGeneratedQuestionSchema).min(1),
})

export type AIGenerateResponse = z.infer<typeof AIGenerateResponseSchema>

export const ScheduleSessionSchema = z.object({
  quiz_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
  timezone: z.string().default('UTC'),
  emails: z.array(z.string().email()).default([]),
})

export type ScheduleSession = z.infer<typeof ScheduleSessionSchema>

export const PlayerJoinSchema = z.object({
  room_code: z.string().min(4).max(8),
  display_name: z.string().min(1, 'Display name is required').max(30, 'Name is too long'),
  avatar: z.string().min(1).default('1'),
})

export type PlayerJoin = z.infer<typeof PlayerJoinSchema>

export const SubmitAnswerSchema = z.object({
  session_id: z.string().uuid(),
  player_id: z.string().uuid(),
  player_token: z.string().min(1),
  question_id: z.string().uuid(),
  selected_index: z.number().int().min(0),
})

export type SubmitAnswer = z.infer<typeof SubmitAnswerSchema>
