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
]

const DAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"]

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

  const getDisplayDateTime = () => {
    const date = formData.startDate
    const dayOfWeek = format(date, "EEE", { locale: ko })
    const dateStr = format(date, "M월 d일")
    const startTime = formData.startTime
    const endTime = formData.endTime
    return `${dateStr} (${dayOfWeek}) ${startTime} - ${endTime}`
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
      console.log("[v0] Creating recurring tasks with group_id:", groupId)

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
          <DialogHeader>{getDisplayDateTime()}</DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Input
                  ref={titleInputRef}
                  placeholder="제목"
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
                /* Case B: Repeat OFF - show date picker and "Mark as Event" checkbox */
                <>
                  <div className="space-y-2">
                    <Label className="text-sm text-zinc-500">날짜</Label>
                    <Input
                      type="date"
                      value={format(formData.startDate, "yyyy-MM-dd")}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value)
                        setFormData((prev) => ({ ...prev, startDate: newDate }))
                      }}
                      className="rounded-lg border-zinc-200"
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="mark-event"
                      checked={markAsEvent}
                      onCheckedChange={(checked) => setMarkAsEvent(checked === true)}
                    />
                    <Label htmlFor="mark-event" className="text-sm font-medium cursor-pointer">
                      중요 일정으로 표시 (이벤트)
                    </Label>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm text-zinc-500">시작</Label>
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                    className="rounded-lg border-zinc-200"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-zinc-500">종료</Label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                    className="rounded-lg border-zinc-200"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-zinc-500">색상</Label>
                <div className="flex gap-2">
                  {TASK_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setSelectedColor(color.value)}
                      className={`w-9 h-9 rounded-full transition-all ${
                        selectedColor === color.value ? "ring-2 ring-zinc-900 ring-offset-2" : ""
                      }`}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Textarea
                  placeholder="메모"
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
              <Button type="submit" className="rounded-lg bg-zinc-900 hover:bg-zinc-800">
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
