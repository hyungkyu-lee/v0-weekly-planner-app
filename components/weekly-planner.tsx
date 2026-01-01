"use client"

import type { Task, WeekSettings } from "@/lib/types"
import { getTaskPosition } from "@/lib/utils/task-utils"
import { checkIsHoliday } from "@/lib/utils/holidays"
import { formatYearMonthWeek, formatYearMonth } from "@/lib/utils/week-utils"
import { format, addDays, startOfWeek, isBefore, startOfDay, isToday, addMonths, startOfMonth } from "date-fns"
import { ko } from "date-fns/locale"
import { useState, useEffect } from "react"
import { TaskCard } from "./task-card"
import { AddTaskDialog } from "./add-task-dialog"
import { MonthlyView } from "./monthly-view"
import { Button } from "./ui/button"
import { ChevronLeft, ChevronRight, Plus, Settings, LogOut } from "lucide-react"
import { WeekSettingsDialog } from "./week-settings-dialog"

interface WeeklyPlannerProps {
  tasks: Task[]
  onTaskUpdate: (task: Task) => Promise<void>
  onTaskDelete: (taskId: string) => Promise<void>
  onDeleteRecurringGroup: (groupId: string) => Promise<void>
  onTaskAdd: (task: Omit<Task, "id" | "created_at" | "updated_at">) => Promise<void>
  onDeleteAllTasks: () => Promise<void>
  onSignOut?: () => void
}

type ViewMode = "weekly" | "monthly"

export function WeeklyPlanner({
  tasks,
  onTaskUpdate,
  onTaskDelete,
  onDeleteRecurringGroup,
  onTaskAdd,
  onDeleteAllTasks,
  onSignOut,
}: WeeklyPlannerProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date
    time: string
  } | null>(null)
  const [weekSettings, setWeekSettings] = useState<WeekSettings>({ startHour: 8, endHour: 23 })
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("weekly")
  const [hoveredTime, setHoveredTime] = useState<string | null>(null)

  const formatTime24Hour = (time24: string) => {
    return time24
  }

  const HOUR_HEIGHT = 45
  const timeSlots = Array.from({ length: (weekSettings.endHour - weekSettings.startHour + 1) * 2 }, (_, i) => {
    const hour = Math.floor(i / 2) + weekSettings.startHour
    const minute = i % 2 === 0 ? "00" : "30"
    return `${hour.toString().padStart(2, "0")}:${minute}`
  })

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

  const handleScroll = () => {
    setIsHeaderVisible(false)

    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }

    const timeout = setTimeout(() => {
      setIsHeaderVisible(true)
    }, 150)

    setScrollTimeout(timeout)
  }

  useEffect(() => {
    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [scrollTimeout])

  const handleSlotClick = (date: Date, time: string) => {
    const today = startOfDay(new Date())
    if (isBefore(startOfDay(date), today)) {
      return
    }
    setSelectedSlot({ date, time })
  }

  const goToPrevious = () => {
    if (viewMode === "weekly") {
      setCurrentWeekStart((prev) => addDays(prev, -7))
    } else {
      setCurrentMonth((prev) => addMonths(prev, -1))
    }
  }

  const goToNext = () => {
    if (viewMode === "weekly") {
      setCurrentWeekStart((prev) => addDays(prev, 7))
    } else {
      setCurrentMonth((prev) => addMonths(prev, 1))
    }
  }

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
    setCurrentMonth(startOfMonth(new Date()))
  }

  const handleDayClick = (date: Date) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 })
    setCurrentWeekStart(weekStart)
    setViewMode("weekly")
  }

  const filteredTasks = viewMode === "monthly" ? tasks.filter((task) => task.task_type === "event") : tasks

  const SIDEBAR_WIDTH = "96px"

  return (
    <div className="h-full flex flex-col bg-white w-full">
      <div className="h-14 border-b border-zinc-200 flex items-center justify-between px-4">
        {/* Left Group */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-zinc-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("weekly")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "weekly" ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              W
            </button>
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "monthly" ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              M
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday} className="h-8 text-xs bg-transparent">
            오늘
          </Button>
        </div>

        {/* Center Group - Date Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={goToPrevious} className="h-10 w-10">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="text-sm font-semibold text-zinc-900 min-w-[140px] text-center">
            {viewMode === "weekly" ? formatYearMonthWeek(currentWeekStart) : formatYearMonth(currentMonth)}
          </div>
          <Button variant="ghost" size="icon" onClick={goToNext} className="h-10 w-10">
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Right Group */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSettingsDialog(true)} className="h-8 gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            설정
          </Button>
          <Button
            onClick={() => setSelectedSlot({ date: new Date(), time: "09:00" })}
            size="sm"
            className="h-8 gap-1.5 bg-zinc-900 hover:bg-zinc-800"
          >
            <Plus className="h-3.5 w-3.5" />새 일정
          </Button>
          {onSignOut && (
            <Button variant="ghost" size="icon" onClick={onSignOut} className="h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {viewMode === "monthly" ? (
        <MonthlyView currentMonth={currentMonth} tasks={filteredTasks} onDayClick={handleDayClick} />
      ) : (
        <div className="flex-1 overflow-auto" onScroll={handleScroll}>
          <div className="relative">
            {/* Day Header Row */}
            <div
              className="sticky top-0 z-40 bg-white border-b border-zinc-200 grid"
              style={{ gridTemplateColumns: `${SIDEBAR_WIDTH} repeat(7, 1fr)` }}
            >
              <div className="border-r border-zinc-100" />
              {weekDays.map((day) => {
                const isPast = isBefore(startOfDay(day), startOfDay(new Date()))
                const isTodayDate = isToday(day)
                const isHoliday = checkIsHoliday(day)

                return (
                  <div
                    key={day.toISOString()}
                    className={`text-center py-3 border-r border-zinc-100 ${isHoliday ? "bg-red-50/30" : ""}`}
                  >
                    <div
                      className={`text-xs font-medium ${
                        isHoliday ? "text-red-500" : isPast ? "text-zinc-300" : "text-zinc-500"
                      }`}
                    >
                      {format(day, "EEE", { locale: ko })}
                    </div>
                    {isTodayDate ? (
                      <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-zinc-900 mt-1">
                        <div className="text-base font-semibold text-white">{format(day, "d")}</div>
                      </div>
                    ) : (
                      <div
                        className={`text-base font-semibold mt-1 ${
                          isHoliday ? "text-red-500" : isPast ? "text-zinc-300" : "text-zinc-900"
                        }`}
                      >
                        {format(day, "d")}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Time Grid Body */}
            <div className="grid" style={{ gridTemplateColumns: `${SIDEBAR_WIDTH} repeat(7, 1fr)` }}>
              {/* Time Column */}
              <div className="sticky left-0 bg-white z-10 border-r border-zinc-100">
                {timeSlots.map((time) => (
                  <div
                    key={time}
                    className={`flex items-center justify-center text-xs border-t border-zinc-100 transition-colors ${
                      hoveredTime === time ? "text-zinc-900 font-bold" : "text-zinc-400 font-medium"
                    }`}
                    style={{ height: `${HOUR_HEIGHT / 2}px` }}
                  >
                    {formatTime24Hour(time)}
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {weekDays.map((day) => {
                const isPast = isBefore(startOfDay(day), startOfDay(new Date()))
                const isHoliday = checkIsHoliday(day)

                return (
                  <div
                    key={day.toISOString()}
                    className={`relative border-r border-zinc-100 ${isHoliday ? "bg-red-50/30" : ""}`}
                  >
                    {timeSlots.map((time) => (
                      <div
                        key={time}
                        className={`border-t border-zinc-100 transition-colors ${
                          isPast ? "bg-zinc-100" : "hover:bg-zinc-50/70 cursor-pointer"
                        }`}
                        style={{ height: `${HOUR_HEIGHT / 2}px` }}
                        onClick={() => handleSlotClick(day, time)}
                        onMouseEnter={() => !isPast && setHoveredTime(time)}
                        onMouseLeave={() => setHoveredTime(null)}
                      />
                    ))}

                    {filteredTasks
                      .filter((task) => {
                        const taskDate = new Date(task.start_time)
                        return format(taskDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
                      })
                      .map((task) => {
                        const { top, height } = getTaskPosition(task.start_time, task.end_time, weekSettings.startHour)
                        return (
                          <div
                            key={task.id}
                            className="absolute left-0 right-0"
                            style={{ top: `${top}px`, height: `${height}px` }}
                          >
                            <TaskCard
                              task={task}
                              onUpdate={onTaskUpdate}
                              onDelete={onTaskDelete}
                              onDeleteRecurringGroup={onDeleteRecurringGroup}
                            />
                          </div>
                        )
                      })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {selectedSlot && (
        <AddTaskDialog
          open={!!selectedSlot}
          onOpenChange={(open) => !open && setSelectedSlot(null)}
          initialDate={selectedSlot.date}
          initialTime={selectedSlot.time}
          existingTasks={tasks}
          onTaskAdd={onTaskAdd}
        />
      )}

      <WeekSettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        settings={weekSettings}
        onSettingsChange={setWeekSettings}
        onDeleteAllTasks={onDeleteAllTasks}
      />
    </div>
  )
}
