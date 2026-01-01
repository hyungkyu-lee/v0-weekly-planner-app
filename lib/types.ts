export interface Task {
  id: string
  user_id: string
  title: string
  start_time: string
  end_time: string
  is_done: boolean
  memo: string | null
  color: string
  task_type: "event" | "routine" | "task" // event = important, routine = recurring, task = single
  event_date?: string | null // For event type tasks
  repeat_days?: number[] // For routine type tasks (0=Monday, 6=Sunday)
  group_id?: string | null // Added for recurring task deletion logic
  created_at?: string
  updated_at?: string
}

export interface TaskFormData {
  title: string
  startDate: Date
  startTime: string
  endTime: string
  memo: string
  taskType: "event" | "routine" | "task"
  eventDate?: Date
  repeatDays: number[]
  skipHolidays: boolean
}

export interface WeekSettings {
  startHour: number // Default 8
  endHour: number // Default 23
  globalInterval: 10 | 30 | 60 | 120 // minutes
  exceptionRules: IntervalException[]
}

export interface IntervalException {
  id: string
  startTime: string // HH:mm format
  endTime: string // HH:mm format
  interval: 0 | 10 | 30 | 60 | 120 // Added 0 for "No Split" option
}

export interface TimeSlot {
  time: string // HH:mm format
  height: number // in pixels
  interval?: number // Added interval to track the minutes covered by this slot
}

export interface HoverState {
  type: "cell" | "task" | null
  dayIndex: number | null
  timeSlots: string[] // Array of time labels to highlight
}
