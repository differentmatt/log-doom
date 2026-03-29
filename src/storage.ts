const PREFIX = 'logdoom'

function key(date: string): string {
  return `${PREFIX}:${date}`
}

export function getDayLog(date: string): Record<string, number> {
  const raw = localStorage.getItem(key(date))
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function setHours(date: string, categoryId: string, hours: number): void {
  const log = getDayLog(date)
  if (hours === 0) {
    delete log[categoryId]
  } else {
    log[categoryId] = hours
  }
  if (Object.keys(log).length === 0) {
    localStorage.removeItem(key(date))
  } else {
    localStorage.setItem(key(date), JSON.stringify(log))
  }
}

export function resetDay(date: string): void {
  localStorage.removeItem(key(date))
}

export function getRecentDays(n: number): { date: string; log: Record<string, number> }[] {
  const results: { date: string; log: Record<string, number> }[] = []
  const today = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const date = formatDate(d)
    const log = getDayLog(date)
    if (Object.keys(log).length > 0) {
      results.push({ date, log })
    }
  }
  return results
}

export function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayString(): string {
  return formatDate(new Date())
}
