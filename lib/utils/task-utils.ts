import type { Task } from "@/lib/types"
import { parseISO, isWithinInterval } from "date-fns"

export function checkTaskOverlap(
  newTask: { start_time: string; end_time: string },
  existingTasks: Task[],
  excludeTaskId?: string,
): Task | null {
  const newStart = parseISO(newTask.start_time)
  const newEnd = parseISO(newTask.end_time)

  for (const task of existingTasks) {
    if (excludeTaskId && task.id === excludeTaskId) continue

    const taskStart = parseISO(task.start_time)
    const taskEnd = parseISO(task.end_time)

    // Check if there's any overlap
    const hasOverlap =
      isWithinInterval(newStart, { start: taskStart, end: taskEnd }) ||
      isWithinInterval(newEnd, { start: taskStart, end: taskEnd }) ||
      isWithinInterval(taskStart, { start: newStart, end: newEnd }) ||
      isWithinInterval(taskEnd, { start: newStart, end: newEnd }) ||
      (newStart <= taskStart && newEnd >= taskEnd)

    if (hasOverlap) {
      return task
    }
  }

  return null
}

// Height of one hour slot is 64px (32px per 30-minute slot)
const HOUR_HEIGHT = 64
const HALF_HOUR_HEIGHT = 32

export function getTaskPosition(startTime: string, endTime: string, startHour = 8) {
  const start = parseISO(startTime)
  const end = parseISO(endTime)

  const startHourTime = start.getHours()
  const startMinute = start.getMinutes()
  const endHourTime = end.getHours()
  const endMinute = end.getMinutes()

  // Calculate exact position in pixels
  const hourOffset = startHourTime - startHour
  const minuteOffset = startMinute / 60
  const top = (hourOffset + minuteOffset) * HOUR_HEIGHT

  // Calculate exact duration in pixels
  const durationHours = endHourTime - startHourTime
  const durationMinutes = (endMinute - startMinute) / 60
  const height = (durationHours + durationMinutes) * HOUR_HEIGHT

  return {
    top,
    height,
  }
}
