import { create } from 'zustand'

export interface RoomPlayer {
  id: string
  display_name: string
  avatar: string
  score: number
  kicked?: boolean
  tab_switch_count?: number
}

export interface CurrentQuestionData {
  id: string
  text: string
  options: string[]
  timer_seconds: number
  points: number
  image_url?: string
  correct_index?: number // Only present for host or after question ends
}

interface RoomStoreState {
  roomCode: string
  status: 'lobby' | 'live' | 'question_ended' | 'leaderboard' | 'podium' | 'ended'
  currentQuestionIndex: number
  totalQuestions: number
  questionStartedAt: string | null
  timerSeconds: number
  currentQuestion: CurrentQuestionData | null
  players: RoomPlayer[]
  leaderboard: Array<{ id: string; display_name: string; avatar: string; score: number }>

  // Player-specific state
  playerId: string | null
  playerToken: string | null
  displayName: string | null
  playerAvatar: string | null
  selectedAnswerIndex: number | null
  hasAnswered: boolean
  isCorrect: boolean | null
  pointsAwarded: number
  playerScore: number
  tabSwitchCount: number

  // Actions
  setRoomState: (updates: Partial<RoomStoreState>) => void
  setPlayerInfo: (info: { id: string; token: string; name: string; avatar: string; score?: number }) => void
  submitAnswer: (index: number) => void
  recordAnswerResult: (isCorrect: boolean, points: number) => void
  incrementTabSwitch: () => void
  resetAnswerState: () => void
}

export const useRoomStore = create<RoomStoreState>((set) => ({
  roomCode: '',
  status: 'lobby',
  currentQuestionIndex: 0,
  totalQuestions: 0,
  questionStartedAt: null,
  timerSeconds: 20,
  currentQuestion: null,
  players: [],
  leaderboard: [],

  playerId: null,
  playerToken: null,
  displayName: null,
  playerAvatar: null,
  selectedAnswerIndex: null,
  hasAnswered: false,
  isCorrect: null,
  pointsAwarded: 0,
  playerScore: 0,
  tabSwitchCount: 0,

  setRoomState: (updates) => set((state) => ({ ...state, ...updates })),

  setPlayerInfo: ({ id, token, name, avatar, score = 0 }) =>
    set({
      playerId: id,
      playerToken: token,
      displayName: name,
      playerAvatar: avatar,
      playerScore: score,
    }),

  submitAnswer: (index) =>
    set({
      selectedAnswerIndex: index,
      hasAnswered: true,
    }),

  recordAnswerResult: (isCorrect, points) =>
    set((state) => ({
      isCorrect,
      pointsAwarded: points,
      playerScore: state.playerScore + points,
    })),

  incrementTabSwitch: () =>
    set((state) => ({
      tabSwitchCount: state.tabSwitchCount + 1,
    })),

  resetAnswerState: () =>
    set({
      selectedAnswerIndex: null,
      hasAnswered: false,
      isCorrect: null,
      pointsAwarded: 0,
    }),
}))
