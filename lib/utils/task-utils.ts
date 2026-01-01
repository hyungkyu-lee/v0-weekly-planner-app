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

export function getTaskPosition(startTime: string, endTime: string, startHour = 8) {
  const start = parseISO(startTime)
  const end = parseISO(endTime)

  const startHourTime = start.getHours()
  const startMinute = start.getMinutes()
  const endHourTime = end.getHours()
  const endMinute = end.getMinutes()

  // Calculate position from custom start hour
  const topOffset = (startHourTime - startHour) * 2 + startMinute / 30
  const duration = (endHourTime - startHourTime) * 2 + (endMinute - startMinute) / 30

  return {
    top: topOffset * 24,
    height: duration * 24,
  }
}
