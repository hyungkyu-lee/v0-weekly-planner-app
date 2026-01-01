import type { Task, TimeSlot } from "@/lib/types"
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

// Height of one hour slot is 27px (60% reduction from 45px)
const HOUR_HEIGHT = 27
const HALF_HOUR_HEIGHT = 13.5

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

export function calculateTaskPosition(
  startTime: string,
  endTime: string,
  timeSlots: TimeSlot[],
): { top: number; height: number } {
  const start = parseISO(startTime)
  const end = parseISO(endTime)

  const startHour = start.getHours()
  const startMinute = start.getMinutes()
  const startTotalMinutes = startHour * 60 + startMinute

  const endHour = end.getHours()
  const endMinute = end.getMinutes()
  const endTotalMinutes = endHour * 60 + endMinute

  let top = 0
  let height = 0
  let foundStart = false

  // Iterate through time slots to calculate cumulative position
  for (let i = 0; i < timeSlots.length; i++) {
    const slot = timeSlots[i]
    const [slotHour, slotMin] = slot.time.split(":").map(Number)
    const slotStartMinutes = slotHour * 60 + slotMin
    const slotEndMinutes = slotStartMinutes + (slot.interval || 30)

    // Task starts in or before this slot
    if (!foundStart && startTotalMinutes >= slotStartMinutes && startTotalMinutes < slotEndMinutes) {
      foundStart = true
      // Calculate partial offset if task starts mid-slot
      const minutesIntoSlot = startTotalMinutes - slotStartMinutes
      const slotInterval = slot.interval || 30
      const proportionalOffset = (minutesIntoSlot / slotInterval) * slot.height
      top += proportionalOffset
    } else if (!foundStart) {
      // Haven't reached the start yet, add full slot height
      top += slot.height
    }

    // Task ends in this slot
    if (foundStart && endTotalMinutes <= slotEndMinutes) {
      const minutesIntoSlot = Math.min(endTotalMinutes, slotEndMinutes) - Math.max(startTotalMinutes, slotStartMinutes)
      const slotInterval = slot.interval || 30
      const proportionalHeight = (minutesIntoSlot / slotInterval) * slot.height
      height += proportionalHeight
      break
    } else if (foundStart) {
      // Task spans multiple slots, add full height
      height += slot.height
    }
  }

  return { top, height }
}
