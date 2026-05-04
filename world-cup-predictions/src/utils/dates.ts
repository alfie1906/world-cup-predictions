const UK_TIME_ZONE = 'Europe/London'

export const parseUtcKickoff = (kickoff: string) => {
  const hasTimeZone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(kickoff)
  return new Date(hasTimeZone ? kickoff : `${kickoff}Z`)
}

export const londonDateKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    timeZone: UK_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(date)

  const value = (type: string) => parts.find((part) => part.type === type)?.value || ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export const kickoffDateKey = (kickoff: string) => londonDateKey(parseUtcKickoff(kickoff))

export const formatKickoffBst = (kickoff: string) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: UK_TIME_ZONE,
    timeZoneName: 'short',
  }).format(parseUtcKickoff(kickoff))

export const daySuffix = (day: number) => {
  if (day >= 11 && day <= 13) return 'th'

  switch (day % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

export const formatDateShort = (dateKey: string) => {
  const [, , dayPart] = dateKey.split('-')
  const day = Number(dayPart)
  const month = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    timeZone: UK_TIME_ZONE,
  }).format(new Date(`${dateKey}T12:00:00Z`))

  return `${day}${daySuffix(day)} ${month}`
}
