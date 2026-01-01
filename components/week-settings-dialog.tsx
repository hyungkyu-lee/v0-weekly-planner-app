"use client"

import type { WeekSettings } from "@/lib/types"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import { useState, useEffect } from "react"
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

interface WeekSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: WeekSettings
  onSettingsChange: (settings: WeekSettings) => void
  onDeleteAllTasks: () => Promise<void>
}

export function WeekSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  onDeleteAllTasks,
}: WeekSettingsDialogProps) {
  const [startHour, setStartHour] = useState(settings.startHour)
  const [endHour, setEndHour] = useState(settings.endHour)
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false)

  useEffect(() => {
    setStartHour(settings.startHour)
    setEndHour(settings.endHour)
  }, [settings])

  const handleSave = () => {
    if (startHour >= endHour) {
      alert("시작 시간은 종료 시간보다 이전이어야 합니다.")
      return
    }

    onSettingsChange({ startHour, endHour })
    onOpenChange(false)
  }

  const handleDeleteAll = async () => {
    await onDeleteAllTasks()
    setShowDeleteAllDialog(false)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">주간 설정</DialogTitle>
            <DialogDescription className="text-zinc-500">표시할 시간 범위를 설정하세요</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="startHour">시작 시간</Label>
              <Input
                id="startHour"
                type="number"
                min="0"
                max="23"
                value={startHour}
                onChange={(e) => setStartHour(Number.parseInt(e.target.value))}
                className="rounded-xl"
              />
              <p className="text-xs text-zinc-500">오전 0시부터 오후 11시까지 선택 가능합니다</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endHour">종료 시간</Label>
              <Input
                id="endHour"
                type="number"
                min="0"
                max="23"
                value={endHour}
                onChange={(e) => setEndHour(Number.parseInt(e.target.value))}
                className="rounded-xl"
              />
              <p className="text-xs text-zinc-500">오전 0시부터 오후 11시까지 선택 가능합니다</p>
            </div>
            <div className="pt-4 border-t border-zinc-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteAllDialog(true)}
                className="w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
              >
                모든 일정 삭제
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              취소
            </Button>
            <Button onClick={handleSave} className="rounded-xl">
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>모든 일정 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 모든 일정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="rounded-lg bg-red-500 hover:bg-red-600">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
