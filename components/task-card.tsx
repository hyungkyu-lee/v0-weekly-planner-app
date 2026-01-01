"use client"

import type React from "react"

import type { Task } from "@/lib/types"
import { format, parseISO } from "date-fns"
import { Check, FileText } from "lucide-react"
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog"
import { Button } from "./ui/button"
import { Trash2 } from "lucide-react"

interface TaskCardProps {
  task: Task
  onUpdate: (task: Task) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
}

export function TaskCard({ task, onUpdate, onDelete }: TaskCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showRecurringDeleteDialog, setShowRecurringDeleteDialog] = useState(false)

  const handleToggleDone = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await onUpdate({ ...task, is_done: !task.is_done })
  }

  const handleDelete = async () => {
    await onDelete(task.id)
    setShowDeleteDialog(false)
    setShowDetailDialog(false)
  }

  const handleDeleteAllRecurring = async () => {
    if (task.group_id) {
      await onDelete(task.group_id)
    }
    setShowRecurringDeleteDialog(false)
    setShowDetailDialog(false)
  }

  const handleDeleteClick = () => {
    if (task.task_type === "routine" && task.group_id) {
      setShowRecurringDeleteDialog(true)
    } else {
      setShowDeleteDialog(true)
    }
  }

  const getTextColor = (bgColor: string) => {
    const hex = bgColor.replace("#", "")
    const r = Number.parseInt(hex.substr(0, 2), 16)
    const g = Number.parseInt(hex.substr(2, 2), 16)
    const b = Number.parseInt(hex.substr(4, 2), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 155 ? "#18181b" : "#ffffff"
  }

  const textColor = getTextColor(task.color)

  return (
    <>
      <div
        className={`h-full rounded-sm p-1.5 transition-all duration-200 hover:scale-[1.01] cursor-pointer border-l-2 ${
          task.is_done ? "opacity-60" : ""
        }`}
        style={{
          backgroundColor: task.color,
          borderLeftColor: task.color,
          filter: "brightness(0.95)",
        }}
        onClick={() => setShowDetailDialog(true)}
      >
        <div className="flex items-start gap-1.5 h-full">
          <button
            onClick={handleToggleDone}
            className={`flex-shrink-0 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5`}
            style={{
              borderColor: textColor,
              backgroundColor: task.is_done ? textColor : "transparent",
            }}
          >
            {task.is_done && <Check className="w-2 h-2" style={{ color: task.color }} />}
          </button>
          <div className="flex-1 min-w-0 flex items-center justify-between">
            <h4
              className={`text-xs font-medium truncate ${task.is_done ? "line-through" : ""}`}
              style={{ color: textColor }}
            >
              {task.title}
            </h4>
            {task.memo && (
              <FileText className="w-3 h-3 flex-shrink-0 ml-1" style={{ color: textColor, opacity: 0.6 }} />
            )}
          </div>
        </div>
      </div>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{task.title}</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500">
              {format(parseISO(task.start_time), "M월 d일 HH:mm")} - {format(parseISO(task.end_time), "HH:mm")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {task.memo && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-900">메모</p>
                <p className="text-sm text-zinc-600">{task.memo}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDeleteClick}
              className="rounded-lg border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              삭제
            </Button>
            <Button onClick={() => setShowDetailDialog(false)} className="rounded-lg bg-zinc-900 hover:bg-zinc-800">
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRecurringDeleteDialog} onOpenChange={setShowRecurringDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>반복 일정 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 일정만 삭제하시겠습니까, 아니면 앞으로의 모든 일정을 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDelete()
                setShowRecurringDeleteDialog(false)
              }}
              className="rounded-lg bg-zinc-900 hover:bg-zinc-800"
            >
              이 일정만 삭제
            </AlertDialogAction>
            <AlertDialogAction onClick={handleDeleteAllRecurring} className="rounded-lg bg-red-500 hover:bg-red-600">
              모두 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
