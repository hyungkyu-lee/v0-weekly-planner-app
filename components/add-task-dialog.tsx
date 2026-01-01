"use client"

import type React from "react"
import type { Task, TaskFormData } from "@/lib/types"
import { checkTaskOverlap } from "@/lib/utils/task-utils"
import { format, parse, addDays } from "date-fns"
import { ko } from "date-fns/locale"
import { useState, useEffect, useRef } from "react"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "./ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Switch } from "./ui/switch"
import { Checkbox } from "./ui/checkbox"
import { useAuth } from "./auth-provider"

interface AddTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialDate: Date
  initialTime: string
  existingTasks: Task[]
  onTaskAdd: (task: Omit<Task, "id" | "created_at" | "updated_at">) => Promise<void>
}

const TASK_COLORS = [
  { name: "파스텔 블루", value: "#93c5fd" },
  { name: "민트", value: "#6ee7b7" },
  { name: "라벤더", value: "#c4b5fd" },
  { name: "피치", value: "#fda4af" },
  { name: "옐로", value: "#fde047" },
  { name: "그레이", value: "#d4d4d8" },
  { name: "오렌지", value: "#fdba74" },
  { name: "남색", value: "#93b3fd" },
]

const DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"]

function TimePicker({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (time: string) => void
  label: string
}) {
  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":").map(Number)
    const isPM = hours >= 12
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    return { hour: displayHour, minute: minutes, isPM }
  }

  const { hour, minute, isPM } = parseTime(value)

  const toggleAmPm = () => {
    const [hours, minutes] = value.split(":").map(Number)
    const newHours = isPM ? (hours === 12 ? 0 : hours - 12) : hours === 12 ? 12 : hours + 12
    onChange(`${String(newHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`)
  }

  const handleHourScroll = (e: React.WheelEvent) => {
    e.preventDefault()
    const [hours, minutes] = value.split(":").map(Number)
    const delta = e.deltaY > 0 ? -1 : 1
    let newHour = hour + delta
    if (newHour < 1) newHour = 12
    if (newHour > 12) newHour = 1

    const actualHour = isPM ? (newHour === 12 ? 12 : newHour + 12) : newHour === 12 ? 0 : newHour
    onChange(`${String(actualHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`)
  }

  const handleMinuteScroll = (e: React.WheelEvent) => {
    e.preventDefault()
    const [hours, minutes] = value.split(":").map(Number)
    const delta = e.deltaY > 0 ? -5 : 5
    let newMinute = minutes + delta
    if (newMinute < 0) newMinute = 55
    if (newMinute > 59) newMinute = 0

    onChange(`${String(hours).padStart(2, "0")}:${String(newMinute).padStart(2, "0")}`)
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm text-zinc-500">{label}</Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleAmPm}
          className="px-3 py-2 border border-zinc-200 rounded-lg bg-white hover:bg-zinc-50 transition-colors text-sm font-medium min-w-[60px]"
        >
          {isPM ? "오후" : "오전"}
        </button>
        <div
          className="flex items-center gap-1 px-3 py-2 border border-zinc-200 rounded-lg bg-white cursor-pointer select-none hover:bg-zinc-50"
          onWheel={handleHourScroll}
        >
          <span className="text-base font-medium w-6 text-center">{String(hour).padStart(2, "0")}</span>
        </div>
        <span className="text-zinc-400">:</span>
        <div
          className="flex items-center gap-1 px-3 py-2 border border-zinc-200 rounded-lg bg-white cursor-pointer select-none hover:bg-zinc-50"
          onWheel={handleMinuteScroll}
        >
          <span className="text-base font-medium w-6 text-center">{String(minute).padStart(2, "0")}</span>
        </div>
      </div>
    </div>
  )
}

export function AddTaskDialog({
  open,
  onOpenChange,
  initialDate,
  initialTime,
  existingTasks,
  onTaskAdd,
}: AddTaskDialogProps) {
  const { user } = useAuth()
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState<TaskFormData>({
    title: "",
    startDate: initialDate,
    startTime: initialTime,
    endTime: format(parse(initialTime, "HH:mm", new Date()).getTime() + 60 * 60 * 1000, "HH:mm"),
    memo: "",
    taskType: "task",
    eventDate: initialDate,
    repeatDays: [],
    skipHolidays: false,
  })
  const [selectedColor, setSelectedColor] = useState(TASK_COLORS[0].value)
  const [isRepeat, setIsRepeat] = useState(false)
  const [markAsEvent, setMarkAsEvent] = useState(false)
  const [conflictTask, setConflictTask] = useState<Task | null>(null)
  const [pendingTasks, setPendingTasks] = useState<Omit<Task, "id" | "created_at" | "updated_at">[]>([])

  useEffect(() => {
    if (open && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus()
      }, 100)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setFormData({
        title: "",
        startDate: initialDate,
        startTime: initialTime,
        endTime: format(parse(initialTime, "HH:mm", new Date()).getTime() + 60 * 60 * 1000, "HH:mm"),
        memo: "",
        taskType: "task",
        eventDate: initialDate,
        repeatDays: [],
        skipHolidays: false,
      })
      setIsRepeat(false)
      setMarkAsEvent(false)
      setSelectedColor(TASK_COLORS[0].value)
    }
  }, [open, initialDate, initialTime])

  const handleStartTimeChange = (newStartTime: string) => {
    setFormData((prev) => {
      const [startHours] = newStartTime.split(":").map(Number)
      const [endHours, endMinutes] = prev.endTime.split(":").map(Number)

      if (startHours >= 12 && endHours < 12) {
        const newEndHours = endHours === 0 ? 12 : endHours + 12
        return {
          ...prev,
          startTime: newStartTime,
          endTime: `${String(newEndHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`,
        }
      }

      return { ...prev, startTime: newStartTime }
    })
  }

  const getDisplayDateTime = () => {
    const date = formData.startDate
    const dayOfWeek = format(date, "EEEE", { locale: ko })
    const dateStr = format(date, "M월 d일")
    return isRepeat ? dateStr : `${dateStr} ${dayOfWeek}`
  }

  const handleDateScroll = (e: React.WheelEvent) => {
    e.preventDefault()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const delta = e.deltaY > 0 ? -1 : 1
    const newDate = addDays(formData.startDate, delta)

    if (newDate >= today) {
      setFormData((prev) => ({ ...prev, startDate: newDate }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const tasksToAdd: Omit<Task, "id" | "created_at" | "updated_at">[] = []

    if (isRepeat) {
      if (formData.repeatDays.length === 0) {
        alert("반복할 요일을 선택해주세요.")
        return
      }

      const groupId = crypto.randomUUID()

      const datesToProcess = formData.repeatDays.map((dayOffset) => addDays(formData.startDate, dayOffset))

      for (const date of datesToProcess) {
        const startTime = parse(formData.startTime, "HH:mm", date)
        const endTime = parse(formData.endTime, "HH:mm", date)

        const newTask = {
          user_id: user.id,
          title: formData.title,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          is_done: false,
          memo: formData.memo || null,
          color: selectedColor,
          task_type: "routine" as const,
          repeat_days: formData.repeatDays,
          group_id: groupId,
        }

        const overlap = checkTaskOverlap(newTask, existingTasks)
        if (overlap) {
          setConflictTask(overlap)
          setPendingTasks([newTask])
          return
        }

        tasksToAdd.push(newTask)
      }
    } else {
      const startTime = parse(formData.startTime, "HH:mm", formData.startDate)
      const endTime = parse(formData.endTime, "HH:mm", formData.startDate)

      const newTask = {
        user_id: user.id,
        title: formData.title,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        is_done: false,
        memo: formData.memo || null,
        color: selectedColor,
        task_type: (markAsEvent ? "event" : "task") as const,
      }

      const overlap = checkTaskOverlap(newTask, existingTasks)
      if (overlap) {
        setConflictTask(overlap)
        setPendingTasks([newTask])
        return
      }

      tasksToAdd.push(newTask)
    }

    for (const task of tasksToAdd) {
      await onTaskAdd(task)
    }

    onOpenChange(false)
    resetForm()
  }

  const handleReplaceTask = async () => {
    if (!conflictTask || pendingTasks.length === 0) return

    for (const task of pendingTasks) {
      await onTaskAdd(task)
    }

    setConflictTask(null)
    setPendingTasks([])
    onOpenChange(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      title: "",
      startDate: initialDate,
      startTime: initialTime,
      endTime: format(parse(initialTime, "HH:mm", new Date()).getTime() + 60 * 60 * 1000, "HH:mm"),
      memo: "",
      taskType: "task",
      eventDate: initialDate,
      repeatDays: [],
      skipHolidays: false,
    })
    setIsRepeat(false)
    setMarkAsEvent(false)
    setSelectedColor(TASK_COLORS[0].value)
  }

  const toggleRepeatDay = (dayIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      repeatDays: prev.repeatDays.includes(dayIndex)
        ? prev.repeatDays.filter((d) => d !== dayIndex)
        : [...prev.repeatDays, dayIndex],
    }))
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader className="text-lg font-semibold text-center">{getDisplayDateTime()}</DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Input
                  ref={titleInputRef}
                  placeholder="일정 제목"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="rounded-lg border-zinc-200 text-base"
                  required
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <Label htmlFor="repeat-toggle" className="text-sm font-medium">
                  반복 일정
                </Label>
                <Switch id="repeat-toggle" checked={isRepeat} onCheckedChange={setIsRepeat} />
              </div>

              {isRepeat ? (
                <div className="space-y-2">
                  <Label className="text-sm text-zinc-500">반복 요일</Label>
                  <div className="flex gap-2">
                    {DAY_NAMES.map((day, index) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleRepeatDay(index)}
                        className={`flex-1 h-10 rounded-full text-sm font-medium transition-all ${
                          formData.repeatDays.includes(index)
                            ? "bg-zinc-900 text-white"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm text-zinc-500">날짜</Label>
                    <div className="relative cursor-pointer" onWheel={handleDateScroll}>
                      <Input
                        type="date"
                        value={format(formData.startDate, "yyyy-MM-dd")}
                        onChange={(e) => {
                          const newDate = new Date(e.target.value)
                          setFormData((prev) => ({ ...prev, startDate: newDate }))
                        }}
                        className="rounded-lg border-zinc-200 pr-16"
                        required
                      />
                      <div className="absolute right-10 top-1/2 -translate-y-1/2 text-sm text-zinc-500 pointer-events-none">
                        ({format(formData.startDate, "EEE", { locale: ko })})
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <Label htmlFor="mark-event" className="text-sm font-medium">
                      중요 일정 표시
                    </Label>
                    <Checkbox
                      id="mark-event"
                      checked={markAsEvent}
                      onCheckedChange={(checked) => setMarkAsEvent(checked === true)}
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <TimePicker value={formData.startTime} onChange={handleStartTimeChange} label="시작 시간" />
                <TimePicker
                  value={formData.endTime}
                  onChange={(time) => setFormData((prev) => ({ ...prev, endTime: time }))}
                  label="종료 시간"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-zinc-500">색상</Label>
                <div className="flex gap-2 flex-wrap">
                  {TASK_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setSelectedColor(color.value)}
                      className={`w-9 h-9 rounded-full transition-all ${
                        selectedColor === color.value ? "ring-2 ring-zinc-900 ring-offset-2" : ""
                      }`}
                      style={{ backgroundColor: color.value }}
                      aria-label={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-zinc-500">메모</Label>
                <Textarea
                  placeholder="메모를 입력하세요"
                  value={formData.memo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, memo: e.target.value }))}
                  className="rounded-lg resize-none border-zinc-200"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-lg border-zinc-200"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={!formData.title.trim()}
                className="rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                추가
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!conflictTask} onOpenChange={() => setConflictTask(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>시간 충돌 감지</AlertDialogTitle>
            <AlertDialogDescription>
              이미 이 시간에 다른 일정이 있습니다. 기존 일정을 대체하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConflictTask(null)
                setPendingTasks([])
              }}
              className="rounded-lg"
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleReplaceTask} className="rounded-lg bg-red-500 hover:bg-red-600">
              대체
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
