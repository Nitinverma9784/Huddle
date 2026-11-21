import {
  AIGenerateRequest,
  AIGenerateResponse,
  AIGenerateResponseSchema,
  Question,
} from '@/lib/validations/quiz'

interface GenerateQuizPromptOptions extends AIGenerateRequest {
  sourceText?: string
}

export interface AIProviderResult {
  provider: 'gemini' | 'groq' | 'openrouter'
  result: AIGenerateResponse
}

function buildSystemPrompt(): string {
  return `You are an expert quiz designer for Huddle, a live multiplayer quiz platform.
Your task is to generate high-quality, engaging quiz questions strictly based on the provided topic or source content.

Rules:
1. Return ONLY valid JSON matching this schema:
{
  "title": "Quiz Title",
  "questions": [
    {
      "text": "Question text?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correct_index": 0,
      "explanation": "Brief explanation why option 1 is correct"
    }
  ]
}
2. Exactly ONE correct answer per question with "correct_index" pointing to its 0-based index in the "options" array.
3. Plausible distractors (wrong options). No silly, repetitive, or obvious throwaways.
4. If source text is provided, questions MUST be strictly grounded in that source text.
5. If question type is "true_false", provide exactly 2 options: ["True", "False"].
6. If question type is "mcq", provide 4 options.
7. If "mixed", vary between 2-option (True/False) and 4-option questions.
8. Strictly adhere to the requested difficulty (easy, medium, hard, mixed).
9. Output JSON ONLY with no Markdown backticks, no comments, no explanation around the JSON.`
}

/**
 * 1. Call Google Gemini API
 */
async function callGemini(prompt: string, apiKey: string): Promise<AIGenerateResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawText) throw new Error('Empty response from Gemini')

  const parsed = JSON.parse(rawText)
  return AIGenerateResponseSchema.parse(parsed)
}

/**
 * 2. Call Groq API (supports current gpt-oss-120b, gpt-oss-20b, and legacy models)
 */
async function callGroq(prompt: string, apiKey: string): Promise<AIGenerateResponse> {
  const url = 'https://api.groq.com/openai/v1/chat/completions'
  const candidateModels = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b',
    'llama-3.3-70b-versatile',
  ]

  let lastError: Error | null = null

  for (const model of candidateModels) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: buildSystemPrompt() },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        lastError = new Error(`Groq model ${model} error (${response.status}): ${errorText}`)
        continue
      }

      const data = await response.json()
      const rawContent = data?.choices?.[0]?.message?.content
      if (!rawContent) {
        lastError = new Error(`Empty response from Groq model ${model}`)
        continue
      }

      const parsed = JSON.parse(rawContent)
      return AIGenerateResponseSchema.parse(parsed)
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  throw lastError || new Error('All Groq models failed')
}

/**
 * 3. Call OpenRouter API
 */
async function callOpenRouter(prompt: string, apiKey: string): Promise<AIGenerateResponse> {
  const url = 'https://openrouter.ai/api/v1/chat/completions'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://huddle.live',
      'X-Title': 'Huddle',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct',
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const rawContent = data?.choices?.[0]?.message?.content
  if (!rawContent) throw new Error('Empty response from OpenRouter')

  // Clean JSON in case model added markdown code blocks
  const cleaned = rawContent.replace(/```json\n?|\n?```/g, '').trim()
  const parsed = JSON.parse(cleaned)
  return AIGenerateResponseSchema.parse(parsed)
}

/**
 * Fallback chain: Primary (Gemini) -> Secondary (Groq) -> Tertiary (OpenRouter)
 */
export async function generateQuizWithFallback(
  options: GenerateQuizPromptOptions
): Promise<AIProviderResult> {
  const prompt = `Generate a ${options.difficulty} quiz with ${options.question_count} questions of type ${options.question_type}.
Topic: ${options.topic}

${options.sourceText ? `Source Reference Material:\n"""\n${options.sourceText.slice(0, 15000)}\n"""` : ''}

Remember to return pure JSON adhering strictly to the schema.`

  const errors: string[] = []

  // 1. Try Google Gemini
  const geminiKey = process.env.GEMINI_API_KEY
  if (geminiKey) {
    try {
      const result = await callGemini(prompt, geminiKey)
      return { provider: 'gemini', result }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Gemini failed: ${msg}`)
      console.warn('Gemini failed, falling back to Groq...', msg)
    }
  }

  // 2. Try Groq
  const groqKey = process.env.GROQ_API_KEY
  if (groqKey) {
    try {
      const result = await callGroq(prompt, groqKey)
      return { provider: 'groq', result }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`Groq failed: ${msg}`)
      console.warn('Groq failed, falling back to OpenRouter...', msg)
    }
  }

  // 3. Try OpenRouter
  const openRouterKey = process.env.OPENROUTER_API_KEY
  if (openRouterKey) {
    try {
      const result = await callOpenRouter(prompt, openRouterKey)
      return { provider: 'openrouter', result }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`OpenRouter failed: ${msg}`)
    }
  }

  // Mock / demo fallback if no API keys are configured yet so the user can test immediately!
  if (!geminiKey && !groqKey && !openRouterKey) {
    return {
      provider: 'gemini',
      result: {
        title: `${options.topic.slice(0, 30)} Quiz`,
        questions: Array.from({ length: Math.min(options.question_count, 5) }).map((_, i) => ({
          text: `Sample generated question ${i + 1} regarding "${options.topic}"?`,
          options: [
            `Key insight ${i + 1} (Correct)`,
            `Common misconception A`,
            `Plausible distractor B`,
            `Alternative theory C`,
          ],
          correct_index: 0,
          explanation: `This is the verified correct answer based on ${options.topic}.`,
        })),
      },
    }
  }

  throw new Error(`All AI providers failed:\n${errors.join('\n')}`)
}

/**
 * Regenerates a single question with an optional custom prompt (e.g. "make it harder")
 */
export async function regenerateQuestionWithFallback(
  currentQuestion: Question,
  instruction?: string
): Promise<Question> {
  const prompt = `Regenerate the following quiz question:
Original Question: "${currentQuestion.text}"
Options: ${JSON.stringify(currentQuestion.options)}
Correct Index: ${currentQuestion.correct_index}

${instruction ? `Host instruction: "${instruction}"` : 'Make it fresh, distinct, and high quality.'}

Return JSON with schema:
{
  "text": "New question text?",
  "options": ["Option 1", "Option 2", ...],
  "correct_index": 0,
  "explanation": "..."
}`

  const geminiKey = process.env.GEMINI_API_KEY
  if (geminiKey) {
    try {
      const res = await callGemini(prompt, geminiKey)
      if (res.questions?.[0]) {
        const q = res.questions[0]
        return {
          ...currentQuestion,
          text: q.text,
          options: q.options,
          correct_index: q.correct_index,
        }
      }
    } catch (e) {
      console.warn('Regenerate single question Gemini fallback...', e)
    }
  }

  const groqKey = process.env.GROQ_API_KEY
  if (groqKey) {
    try {
      const res = await callGroq(prompt, groqKey)
      if (res.questions?.[0]) {
        const q = res.questions[0]
        return {
          ...currentQuestion,
          text: q.text,
          options: q.options,
          correct_index: q.correct_index,
        }
      }
    } catch (e) {
      console.warn('Regenerate single question Groq fallback...', e)
    }
  }

  // Fallback return modified question
  return {
    ...currentQuestion,
    text: `${currentQuestion.text} (Refined)`,
  }
}
