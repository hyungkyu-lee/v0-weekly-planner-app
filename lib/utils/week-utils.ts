import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, getDate } from "date-fns"

export function getWeekOfMonth(date: Date): number {
  const mondayOfWeek = startOfWeek(date, { weekStartsOn: 1 })
  const dayOfMonth = getDate(mondayOfWeek)
  return Math.ceil(dayOfMonth / 7)
}

export function getMonthCalendarDays(currentMonth: Date): Date[] {
  const firstDay = startOfMonth(currentMonth)
  const lastDay = endOfMonth(currentMonth)

  const startDay = startOfWeek(firstDay, { weekStartsOn: 1 })
  const endDay = endOfWeek(lastDay, { weekStartsOn: 1 })

  return eachDayOfInterval({ start: startDay, end: endDay })
}

export function formatYearMonthWeek(date: Date): string {
  const year = format(date, "yyyy")
  const month = format(date, "M")
  const week = getWeekOfMonth(date)

  return `${year}년 ${month}월 ${week}주차`
}

export function formatYearMonth(date: Date): string {
  const year = format(date, "yyyy")
  const month = format(date, "M")

  return `${year}년 ${month}월`
}
