export const maskSecret = (value: string, visible = 4): string => {
  if (!value) return ''
  const chars = Array.from(value)
  const mask = '•'.repeat(8)
  const count = Math.floor(visible)
  if (!(count > 0) || chars.length <= count * 2 + 2) return mask
  return chars.slice(0, count).join('') + mask + chars.slice(-count).join('')
}
