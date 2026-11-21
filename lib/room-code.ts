/**
 * Generates an uppercase 6-character room code avoiding ambiguous characters (0, O, 1, I, L)
 */
export function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function isValidRoomCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false
  const cleaned = code.trim().toUpperCase()
  return /^[A-Z0-9]{4,8}$/.test(cleaned)
}
