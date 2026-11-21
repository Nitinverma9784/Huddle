import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { AIGenerateResponseSchema } from '../lib/validations/quiz'

describe('LLM Output Parser & Zod Validation', () => {
  it('successfully validates standard AI quiz payload', () => {
    const samplePayload = {
      title: 'JavaScript Essentials',
      questions: [
        {
          text: 'What does typeof null return?',
          options: ['object', 'null', 'undefined', 'number'],
          correct_index: 0,
          explanation: 'In JS, typeof null historically returns "object".',
        },
      ],
    }

    const validated = AIGenerateResponseSchema.parse(samplePayload)
    assert.equal(validated.title, 'JavaScript Essentials')
    assert.equal(validated.questions.length, 1)
    assert.equal(validated.questions[0].correct_index, 0)
  })

  it('rejects questions where correct_index is out of range', () => {
    const invalidPayload = {
      title: 'Invalid Quiz',
      questions: [
        {
          text: 'What is 2 + 2?',
          options: ['3', '4'],
          correct_index: 5, // out of range
        },
      ],
    }

    assert.throws(() => {
      AIGenerateResponseSchema.parse(invalidPayload)
    })
  })

  it('rejects questions with fewer than 2 options', () => {
    const invalidPayload = {
      title: 'Invalid Quiz',
      questions: [
        {
          text: 'Is the sky blue?',
          options: ['Yes'],
          correct_index: 0,
        },
      ],
    }

    assert.throws(() => {
      AIGenerateResponseSchema.parse(invalidPayload)
    })
  })
})
