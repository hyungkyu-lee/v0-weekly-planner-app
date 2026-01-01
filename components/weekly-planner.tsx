"use client"

import type { Task, WeekSettings, TimeSlot, HoverState } from "@/lib/types"
import { checkIsHoliday } from "@/lib/utils/holidays"
import { formatYearMonthWeek, formatYearMonth } from "@/lib/utils/week-utils"
import { format, addDays, startOfWeek, isBefore, startOfDay, isToday, addMonths, startOfMonth } from "date-fns"
import { ko } from "date-fns/locale"
import { useState, useEffect } from "react"
import { TaskCard } from "./task-card"
import { AddTaskDialog } from "./add-task-dialog"
import { TaskViewerDialog } from "./task-viewer-dialog"
import { MonthlyView } from "./monthly-view"
import { Button } from "./ui/button"
import { ChevronLeft, ChevronRight, Plus, Settings, LogOut } from "lucide-react"
import { WeekSettingsDialog } from "./week-settings-dialog"
import { calculateTaskPosition } from "@/lib/utils/task-utils"

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
  const [weekSettings, setWeekSettings] = useState<WeekSettings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("weekSettings")
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error("[v0] Failed to parse saved settings:", e)
        }
      }
    }
    return {
      startHour: 8,
      endHour: 23,
      globalInterval: 30,
      exceptionRules: [],
    }
  })
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("weekly")
  const [hoverState, setHoverState] = useState<HoverState>({
    type: null,
    dayIndex: null,
    timeSlots: [],
  })

  const [dragState, setDragState] = useState<{
    isDragging: boolean
    startDate: Date | null
    startTime: string | null
    currentDate: Date | null
    currentTime: string | null
  }>({
    isDragging: false,
    startDate: null,
    startTime: null,
    currentDate: null,
    currentTime: null,
  })

  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [viewingTask, setViewingTask] = useState<Task | null>(null)
  const [editMode, setEditMode] = useState<"single" | "all">("single")

  useEffect(() => {
    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [scrollTimeout])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("weekSettings", JSON.stringify(weekSettings))
    }
  }, [weekSettings])

  const formatTimeRange = (time24: string, intervalMinutes: number) => {
    const [hour, minute] = time24.split(":").map(Number)
    const endMinutes = minute + intervalMinutes
    const endHour = Math.floor((hour * 60 + endMinutes) / 60)
    const endMinute = (hour * 60 + endMinutes) % 60

    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} ~ ${endHour.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`
  }

  const HOUR_HEIGHT = 27

  const getNextGlobalAnchor = (currentMinutes: number, globalInterval: number): number => {
    // Calculate the next global anchor point
    // Global anchors are aligned to the start hour (e.g., 8:00, 8:30, 9:00 for 30min intervals)
    const startMinutes = weekSettings.startHour * 60
    const minutesSinceStart = currentMinutes - startMinutes
    const intervalsFromStart = Math.ceil(minutesSinceStart / globalInterval)
    return startMinutes + intervalsFromStart * globalInterval
  }

  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = []
    let cursor = weekSettings.startHour * 60
    const endMinutes = (weekSettings.endHour + 1) * 60

    while (cursor < endMinutes) {
      let nextStepSize = 0

      // Step A: Determine the logic for the current slot
      const activeRule = weekSettings.exceptionRules.find((rule) => {
        const [ruleStartHour, ruleStartMin] = rule.startTime.split(":").map(Number)
        const [ruleEndHour, ruleEndMin] = rule.endTime.split(":").map(Number)
        const ruleStartMinutes = ruleStartHour * 60 + ruleStartMin
        const ruleEndMinutes = ruleEndHour * 60 + ruleEndMin
        return cursor >= ruleStartMinutes && cursor < ruleEndMinutes
      })

      if (activeRule) {
        // [CASE 1] Inside an Exception Rule
        // Use the rule's interval, but DO NOT exceed the rule's end time
        const [ruleEndHour, ruleEndMin] = activeRule.endTime.split(":").map(Number)
        const ruleEndMinutes = ruleEndHour * 60 + ruleEndMin
        const remainingInRule = ruleEndMinutes - cursor

        if (activeRule.interval === 0) {
          // "No Split" mode: use the entire remaining time as one slot
          nextStepSize = remainingInRule
        } else {
          // Use the rule's interval, but don't exceed the rule's end
          nextStepSize = Math.min(activeRule.interval, remainingInRule)
        }
      } else {
        // [CASE 2] Global Interval Mode (The Bridging Logic)
        // We are back to normal mode, but might be at an awkward time (e.g., 08:40)
        // Find the Next Global Anchor
        const nextAnchor = getNextGlobalAnchor(cursor, weekSettings.globalInterval)

        // Calculate distance to that anchor
        const distanceToAnchor = nextAnchor - cursor

        // Check if there's an upcoming exception rule that starts before the next anchor
        const upcomingRule = weekSettings.exceptionRules.find((rule) => {
          const [ruleStartHour, ruleStartMin] = rule.startTime.split(":").map(Number)
          const ruleStartMinutes = ruleStartHour * 60 + ruleStartMin
          return ruleStartMinutes > cursor && ruleStartMinutes < nextAnchor
        })

        if (upcomingRule) {
          // If there's an upcoming rule, bridge to its start
          const [upcomingStartHour, upcomingStartMin] = upcomingRule.startTime.split(":").map(Number)
          const upcomingStartMinutes = upcomingStartHour * 60 + upcomingStartMin
          nextStepSize = upcomingStartMinutes - cursor
        } else {
          // DECISION: Bridge the gap to the next global anchor
          // If distance is smaller than Global Interval, use the distance to "Bridge the Gap"
          // Otherwise, use the Global Interval
          nextStepSize = Math.min(weekSettings.globalInterval, distanceToAnchor)
        }
      }

      // Step B: Render Row & Advance
      const currentHour = Math.floor(cursor / 60)
      const currentMin = cursor % 60
      const currentTime = `${currentHour.toString().padStart(2, "0")}:${currentMin.toString().padStart(2, "0")}`
      const slotHeight = HOUR_HEIGHT

      slots.push({
        time: currentTime,
        height: slotHeight,
        interval: nextStepSize,
      })

      cursor += nextStepSize
    }

    return slots
  }

  const timeSlots = generateTimeSlots()

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

  const handleSlotClick = (date: Date, time: string) => {
    const today = startOfDay(new Date())
    if (isBefore(startOfDay(date), today)) {
      return
    }
    setSelectedSlot({ date, time })
  }

  const handleMouseDown = (date: Date, time: string) => {
    const today = startOfDay(new Date())
    if (isBefore(startOfDay(date), today)) {
      return
    }
    setDragState({
      isDragging: true,
      startDate: date,
      startTime: time,
      currentDate: date,
      currentTime: time,
    })
  }

  const handleMouseEnter = (date: Date, time: string) => {
    if (dragState.isDragging) {
      setDragState((prev) => ({
        ...prev,
        currentDate: date,
        currentTime: time,
      }))
    }
  }

  const handleMouseUp = () => {
    if (dragState.isDragging && dragState.startDate && dragState.startTime) {
      const startDateTime = new Date(dragState.startDate)
      const [startHour, startMinute] = dragState.startTime.split(":").map(Number)
      startDateTime.setHours(startHour, startMinute, 0, 0)

      const endDateTime = new Date(dragState.currentDate || dragState.startDate)
      const [endHour, endMinute] = (dragState.currentTime || dragState.startTime).split(":").map(Number)
      endDateTime.setHours(endHour, endMinute, 0, 0)

      const currentSlot = timeSlots.find((slot) => slot.time === (dragState.currentTime || dragState.startTime))
      const intervalMinutes = currentSlot?.interval || weekSettings.globalInterval
      endDateTime.setMinutes(endDateTime.getMinutes() + intervalMinutes)

      const finalStartTime = startDateTime <= endDateTime ? startDateTime : endDateTime
      const finalEndTime = startDateTime <= endDateTime ? endDateTime : startDateTime

      setSelectedSlot({
        date: finalStartTime,
        time: format(finalStartTime, "HH:mm"),
      })
    }

    setDragState({
      isDragging: false,
      startDate: null,
      startTime: null,
      currentDate: null,
      currentTime: null,
    })
  }

  const getDragSelection = () => {
    if (!dragState.isDragging || !dragState.startDate || !dragState.startTime) {
      return []
    }

    const startDateTime = new Date(dragState.startDate)
    const [startHour, startMinute] = dragState.startTime.split(":").map(Number)
    startDateTime.setHours(startHour, startMinute, 0, 0)

    const endDateTime = new Date(dragState.currentDate || dragState.startDate)
    const [endHour, endMinute] = (dragState.currentTime || dragState.startTime).split(":").map(Number)
    endDateTime.setHours(endHour, endMinute, 0, 0)

    const selections: { dayIndex: number; timeSlot: string }[] = []

    if (
      format(dragState.startDate, "yyyy-MM-dd") === format(dragState.currentDate || dragState.startDate, "yyyy-MM-dd")
    ) {
      const dayIndex = weekDays.findIndex(
        (day) => format(day, "yyyy-MM-dd") === format(dragState.startDate!, "yyyy-MM-dd"),
      )

      const minTime = startDateTime <= endDateTime ? dragState.startTime : dragState.currentTime || dragState.startTime
      const maxTime = startDateTime <= endDateTime ? dragState.currentTime || dragState.startTime : dragState.startTime

      timeSlots.forEach((slot) => {
        if (slot.time >= minTime! && slot.time <= maxTime!) {
          selections.push({ dayIndex, timeSlot: slot.time })
        }
      })
    }

    return selections
  }

  const dragSelections = getDragSelection()

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
    const today = new Date()
    // For 7-day week, put today at index 3 (middle column)
    const daysToSubtract = 3
    const centeredStart = new Date(today)
    centeredStart.setDate(today.getDate() - daysToSubtract)
    const todayWeekStart = startOfWeek(centeredStart, { weekStartsOn: 1 })
    setCurrentWeekStart(todayWeekStart)
    setCurrentMonth(startOfMonth(today))
  }

  const handleDayClick = (date: Date) => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 })
    setCurrentWeekStart(weekStart)
    setViewMode("weekly")
  }

  const filteredTasks = viewMode === "monthly" ? tasks.filter((task) => task.task_type === "event") : tasks

  const handleCellHover = (dayIndex: number, timeSlot: string) => {
    setHoverState({
      type: "cell",
      dayIndex,
      timeSlots: [timeSlot],
    })
  }

  const handleTaskHover = (task: Task, dayIndex: number) => {
    const startTime = new Date(task.start_time)
    const endTime = new Date(task.end_time)

    const coveredSlots = timeSlots
      .filter((slot) => {
        const [hour, minute] = slot.time.split(":").map(Number)
        const slotTime = new Date(startTime)
        slotTime.setHours(hour, minute, 0, 0)
        return slotTime >= startTime && slotTime < endTime
      })
      .map((slot) => slot.time)

    setHoverState({
      type: "task",
      dayIndex,
      timeSlots: coveredSlots,
    })
  }

  const handleHoverLeave = () => {
    setHoverState({
      type: null,
      dayIndex: null,
      timeSlots: [],
    })
  }

  const SIDEBAR_WIDTH = "96px"

  const handleTaskClick = (task: Task) => {
    setViewingTask(task)
  }

  const handleEditFromViewer = (task: Task, mode: "single" | "all") => {
    setViewingTask(null)
    setEditingTask(task)
    setEditMode(mode)
  }

  return (
    <div className="h-screen flex flex-col">
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
          <div className="relative" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            {/* Day Header Row */}
            <div
              className="sticky top-0 z-40 bg-white border-b border-zinc-200 grid"
              style={{ gridTemplateColumns: `${SIDEBAR_WIDTH} repeat(7, 1fr)` }}
            >
              <div className="border-r border-zinc-100" />
              {weekDays.map((day, dayIndex) => {
                const isPast = isBefore(startOfDay(day), startOfDay(new Date()))
                const isTodayDate = isToday(day)
                const isHoliday = checkIsHoliday(day)
                const isHighlighted = hoverState.dayIndex === dayIndex

                return (
                  <div
                    key={day.toISOString()}
                    className={`text-center py-3 border-r border-zinc-100 transition-colors ${
                      isHoliday ? "bg-red-50/30" : ""
                    } ${isHighlighted ? "bg-blue-50" : ""}`}
                  >
                    <div
                      className={`text-xs font-medium ${
                        isHoliday
                          ? "text-red-500"
                          : isPast
                            ? "text-zinc-300"
                            : isHighlighted
                              ? "text-blue-600 font-bold"
                              : "text-zinc-500"
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
                          isHoliday
                            ? "text-red-500"
                            : isPast
                              ? "text-zinc-300"
                              : isHighlighted
                                ? "text-blue-600"
                                : "text-zinc-900"
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
              {/* Time Sidebar */}
              <div className="border-r border-zinc-200">
                {timeSlots.map((slot, index) => {
                  const isHighlighted = hoverState.timeSlots.includes(slot.time)
                  // Calculate end time based on interval
                  const [hours, minutes] = slot.time.split(":").map(Number)
                  const startMinutes = hours * 60 + minutes
                  const endMinutes = startMinutes + slot.interval
                  const endHours = Math.floor(endMinutes / 60)
                  const endMins = endMinutes % 60
                  const endTime = `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`
                  const timeRange = `${slot.time}~${endTime}`

                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-center border-b border-zinc-100 transition-colors ${
                        isHighlighted ? "bg-blue-50 font-semibold text-blue-600" : "text-zinc-400"
                      }`}
                      style={{ height: `${slot.height}px` }}
                    >
                      <span className="text-[10px] font-medium">{timeRange}</span>
                    </div>
                  )
                })}
              </div>

              {/* Day Columns */}
              {weekDays.map((day, dayIndex) => {
                const isPast = isBefore(startOfDay(day), startOfDay(new Date()))
                const isHoliday = checkIsHoliday(day)

                return (
                  <div
                    key={day.toISOString()}
                    className={`relative border-r border-zinc-100 ${isHoliday ? "bg-red-50/30" : ""}`}
                  >
                    {timeSlots.map((slot) => {
                      const isDragSelected = dragSelections.some(
                        (sel) => sel.dayIndex === dayIndex && sel.timeSlot === slot.time,
                      )

                      return (
                        <div
                          key={slot.time}
                          className={`border-t border-zinc-100 transition-colors ${
                            isPast
                              ? "bg-zinc-100"
                              : isDragSelected
                                ? "bg-blue-500/30"
                                : "hover:bg-zinc-50/70 cursor-pointer"
                          }`}
                          style={{ height: `${slot.height}px` }}
                          onClick={() => handleSlotClick(day, slot.time)}
                          onMouseDown={() => handleMouseDown(day, slot.time)}
                          onMouseEnter={() => {
                            if (!isPast) {
                              handleCellHover(dayIndex, slot.time)
                              handleMouseEnter(day, slot.time)
                            }
                          }}
                          onMouseLeave={handleHoverLeave}
                        />
                      )
                    })}

                    {filteredTasks
                      .filter((task) => {
                        const taskDate = new Date(task.start_time)
                        return format(taskDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
                      })
                      .map((task) => {
                        const { top, height } = calculateTaskPosition(task.start_time, task.end_time, timeSlots)
                        return (
                          <div
                            key={task.id}
                            className="absolute left-0 right-0 z-30"
                            style={{ top: `${top}px`, height: `${height}px` }}
                            onMouseEnter={() => handleTaskHover(task, dayIndex)}
                            onMouseLeave={handleHoverLeave}
                          >
                            <TaskCard
                              task={task}
                              onUpdate={onTaskUpdate}
                              onDelete={onTaskDelete}
                              onDeleteRecurringGroup={onDeleteRecurringGroup}
                              taskHeight={height}
                              onClick={handleTaskClick} // Pass edit handler
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

      <TaskViewerDialog
        open={!!viewingTask}
        onOpenChange={(open) => {
          if (!open) setViewingTask(null)
        }}
        task={viewingTask}
        onEdit={handleEditFromViewer}
      />

      <AddTaskDialog
        open={!!selectedSlot || !!editingTask}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSlot(null)
            setEditingTask(null)
            setEditMode("single")
          }
        }}
        initialDate={selectedSlot?.date || new Date()}
        initialTime={selectedSlot?.time || "09:00"}
        existingTasks={tasks}
        onTaskAdd={onTaskAdd}
        editingTask={editingTask}
        editMode={editMode}
        onTaskUpdate={onTaskUpdate}
      />

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
