export function handleNumInput(val: string): number | '' {
  if (val === '') return ''
  const parsed = parseFloat(val)
  return isNaN(parsed) ? '' : parsed
}

export function getNum(val: number | '' | undefined | null): number {
  if (typeof val === 'number' && !isNaN(val)) return val
  if (typeof val === 'string') {
    const p = parseFloat(val)
    return isNaN(p) ? 0 : p
  }
  return 0
}
