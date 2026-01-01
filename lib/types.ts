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
}
