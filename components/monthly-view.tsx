"use client"

import type { Task } from "@/lib/types"
import { getMonthCalendarDays } from "@/lib/utils/week-utils"
import { checkIsHoliday } from "@/lib/utils/holidays"
import { format, isSameMonth, isToday, isSameDay } from "date-fns"

interface MonthlyViewProps {
  currentMonth: Date
  tasks: Task[]
  onDayClick: (date: Date) => void
}

export function MonthlyView({ currentMonth, tasks, onDayClick }: MonthlyViewProps) {
  const calendarDays = getMonthCalendarDays(currentMonth)

  const getTasksForDay = (day: Date) => {
    return tasks.filter((task) => {
      if (task.event_date) {
        return isSameDay(new Date(task.event_date), day)
      }
      return isSameDay(new Date(task.start_time), day)
    })
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["월", "화", "수", "목", "금", "토", "일"].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-zinc-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day) => {
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isTodayDate = isToday(day)
            const isHoliday = checkIsHoliday(day)
            const dayTasks = getTasksForDay(day)

            return (
              <div
                key={day.toISOString()}
                onClick={() => onDayClick(day)}
                className={`
                  aspect-square border border-zinc-200 rounded-lg p-2 cursor-pointer
                  transition-all hover:border-zinc-400 hover:shadow-sm
                  ${!isCurrentMonth ? "bg-zinc-50/50" : "bg-white"}
                  ${isHoliday ? "bg-red-50/30" : ""}
                `}
              >
                <div className="flex flex-col h-full">
                  {/* Date Number */}
                  <div className="flex justify-end mb-1">
                    {isTodayDate ? (
                      <div className="w-6 h-6 rounded-full bg-zinc-900 flex items-center justify-center">
                        <span className="text-xs font-semibold text-white">{format(day, "d")}</span>
                      </div>
                    ) : (
                      <span
                        className={`text-xs font-medium ${
                          isHoliday ? "text-red-500" : !isCurrentMonth ? "text-zinc-300" : "text-zinc-900"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                    )}
                  </div>

                  {/* Event Dots */}
                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="h-1.5 rounded-full" style={{ backgroundColor: task.color }} />
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-[10px] text-zinc-400 mt-0.5">+{dayTasks.length - 3}</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
