import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { generateRoomCode, isValidRoomCode } from '../lib/room-code'

describe('Room Code Logic', () => {
  it('generates a 6-character room code', () => {
    const code = generateRoomCode()
    assert.equal(code.length, 6)
    assert.match(code, /^[A-Z0-9]{6}$/)
  })

  it('does not contain easily confused characters like O, 0, I, 1', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode()
      assert.doesNotMatch(code, /[01IO]/)
    }
  })

  it('validates correct room codes', () => {
    assert.equal(isValidRoomCode('ABC123'), true)
    assert.equal(isValidRoomCode('4K9Z'), true)
    assert.equal(isValidRoomCode('   xy892z   '), true)
  })

  it('rejects invalid or empty room codes', () => {
    assert.equal(isValidRoomCode(''), false)
    assert.equal(isValidRoomCode('AB'), false) // too short
    assert.equal(isValidRoomCode('VERYLONGCODE12345'), false) // too long
    assert.equal(isValidRoomCode('AB-CD'), false) // invalid characters
  })
})
