export const AVATAR_OPTIONS = [
  { id: '1', name: 'Avatar 1', src: '/avatar/avatar-1.png' },
  { id: '2', name: 'Avatar 2', src: '/avatar/avatar-2.png' },
  { id: '3', name: 'Avatar 3', src: '/avatar/avatar-3.png' },
  { id: '4', name: 'Avatar 4', src: '/avatar/avatar-4.png' },
  { id: '5', name: 'Avatar 5', src: '/avatar/avatar-5.png' },
  { id: '6', name: 'Avatar 6', src: '/avatar/avatar-6.png' },
  { id: '7', name: 'Avatar 7', src: '/avatar/avatar-7.png' },
  { id: '8', name: 'Avatar 8', src: '/avatar/avatar-8.png' },
  { id: '9', name: 'Avatar 9', src: '/avatar/avatar-9.png' },
  { id: '10', name: 'Avatar 10', src: '/avatar/avatar-10.png' },
]

export function getAvatarUrl(avatar?: string | null): string {
  if (!avatar) return '/avatar/avatar-1.png'
  if (avatar.startsWith('/avatar/')) return avatar
  if (avatar.startsWith('avatar-')) return `/avatar/${avatar}.png`
  const num = parseInt(avatar, 10)
  if (!isNaN(num) && num >= 1 && num <= 10) {
    return `/avatar/avatar-${num}.png`
  }
  // Stable hash fallback for any arbitrary string seed
  let hash = 0
  for (let i = 0; i < avatar.length; i++) {
    hash = (hash << 5) - hash + avatar.charCodeAt(i)
  }
  const idx = (Math.abs(hash) % 10) + 1
  return `/avatar/avatar-${idx}.png`
}
