"use client"

import type { Task } from "@/lib/types"
import { format, parseISO } from "date-fns"
import { ko } from "date-fns/locale"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
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
import { useState } from "react"

interface TaskViewerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onEdit: (task: Task, mode: "single" | "all") => void
}

export function TaskViewerDialog({ open, onOpenChange, task, onEdit }: TaskViewerDialogProps) {
  const [showEditModeDialog, setShowEditModeDialog] = useState(false)

  if (!task) return null

  const startDate = parseISO(task.start_time)
  const endDate = parseISO(task.end_time)
  const dateStr = format(startDate, "yyyy-MM-dd (EEE)", { locale: ko })
  const timeStr = `${format(startDate, "HH:mm")} ~ ${format(endDate, "HH:mm")}`
  const isRecurring = !!(task?.task_type === "routine" && task?.group_id)

  const handleEditClick = () => {
    if (isRecurring) {
      setShowEditModeDialog(true)
    } else {
      onEdit(task, "single")
      onOpenChange(false)
    }
  }

  const handleEditModeSelect = (mode: "single" | "all") => {
    setShowEditModeDialog(false)
    onEdit(task, mode)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{task.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-zinc-500 mb-1">날짜</p>
              <p className="text-base">{dateStr}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500 mb-1">시간</p>
              <p className="text-base">{timeStr}</p>
            </div>
            {task.memo && (
              <div>
                <p className="text-sm text-zinc-500 mb-1">메모</p>
                <p className="text-base whitespace-pre-wrap">{task.memo}</p>
              </div>
            )}
            {isRecurring && (
              <div>
                <p className="text-sm text-zinc-500 mb-1">반복</p>
                <p className="text-base">반복 일정</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleEditClick} className="w-full rounded-xl">
              수정하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showEditModeDialog} onOpenChange={setShowEditModeDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>반복된 일정입니다</AlertDialogTitle>
            <AlertDialogDescription>어떻게 수정하시겠어요?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction onClick={() => handleEditModeSelect("all")} className="w-full rounded-lg m-0">
              일괄 수정
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleEditModeSelect("single")}
              className="w-full rounded-lg bg-zinc-100 text-zinc-900 hover:bg-zinc-200 m-0"
            >
              이것만 수정
            </AlertDialogAction>
            <AlertDialogCancel className="w-full rounded-lg m-0">취소</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
