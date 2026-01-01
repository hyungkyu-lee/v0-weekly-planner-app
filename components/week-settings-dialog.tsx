"use client"

import { AlertDialogContent } from "@/components/ui/alert-dialog"

import {
  AlertDialog,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"

import type { WeekSettings, IntervalException } from "@/lib/types"
import { Button } from "./ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog"
import { Label } from "./ui/label"
import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Plus, Trash2 } from "lucide-react"

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
  const [globalInterval, setGlobalInterval] = useState<10 | 30 | 60 | 120>(settings.globalInterval || 30)
  const [exceptionRules, setExceptionRules] = useState<IntervalException[]>(settings.exceptionRules || [])
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false)

  useEffect(() => {
    setStartHour(settings.startHour)
    setEndHour(settings.endHour)
    setGlobalInterval(settings.globalInterval || 30)
    setExceptionRules(settings.exceptionRules || [])
  }, [settings])

  const handleAddException = () => {
    const newRule: IntervalException = {
      id: `exception-${Date.now()}`,
      startTime: "09:00",
      endTime: "10:00",
      interval: 30,
    }
    setExceptionRules([...exceptionRules, newRule])
  }

  const handleRemoveException = (id: string) => {
    setExceptionRules(exceptionRules.filter((rule) => rule.id !== id))
  }

  const handleUpdateException = (id: string, field: keyof IntervalException, value: string | number) => {
    setExceptionRules(exceptionRules.map((rule) => (rule.id === id ? { ...rule, [field]: value } : rule)))
  }

  const handleTimeChange = (id: string, field: "startTime" | "endTime", hour: number, minute: number) => {
    const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
    handleUpdateException(id, field, timeString)
  }

  const handleSave = () => {
    if (startHour >= endHour) {
      alert("시작 시간은 종료 시간보다 이전이어야 합니다.")
      return
    }

    onSettingsChange({
      startHour,
      endHour,
      globalInterval,
      exceptionRules,
    })
    onOpenChange(false)
  }

  const handleDeleteAll = async () => {
    await onDeleteAllTasks()
    setShowDeleteAllDialog(false)
    onOpenChange(false)
  }

  const parseTime = (timeString: string): { hour: number; minute: number } => {
    const [hour, minute] = timeString.split(":").map(Number)
    return { hour, minute }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-2xl max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">주간 설정</DialogTitle>
            <DialogDescription className="text-zinc-500">표시할 시간 범위와 그리드 간격을 설정하세요</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>표시 시간 범위</Label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-center gap-1 border border-zinc-200 rounded-lg p-2">
                    <button
                      type="button"
                      onClick={() => setStartHour(Math.min(23, startHour + 1))}
                      className="h-5 w-5 flex items-center justify-center text-zinc-600 hover:bg-zinc-100 rounded"
                    >
                      ▲
                    </button>
                    <div className="text-center font-semibold text-sm w-12">
                      {startHour.toString().padStart(2, "0")}:00
                    </div>
                    <button
                      type="button"
                      onClick={() => setStartHour(Math.max(0, startHour - 1))}
                      className="h-5 w-5 flex items-center justify-center text-zinc-600 hover:bg-zinc-100 rounded"
                    >
                      ▼
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 text-center">시작</p>
                </div>
                <span className="text-zinc-400">~</span>
                <div className="flex-1">
                  <div className="flex items-center justify-center gap-1 border border-zinc-200 rounded-lg p-2">
                    <button
                      type="button"
                      onClick={() => setEndHour(Math.min(23, endHour + 1))}
                      className="h-5 w-5 flex items-center justify-center text-zinc-600 hover:bg-zinc-100 rounded"
                    >
                      ▲
                    </button>
                    <div className="text-center font-semibold text-sm w-12">
                      {endHour.toString().padStart(2, "0")}:00
                    </div>
                    <button
                      type="button"
                      onClick={() => setEndHour(Math.max(0, endHour - 1))}
                      className="h-5 w-5 flex items-center justify-center text-zinc-600 hover:bg-zinc-100 rounded"
                    >
                      ▼
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 text-center">종료</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 pt-4 border-t border-zinc-200">
              <Label htmlFor="globalInterval">기본 그리드 간격</Label>
              <Select
                value={globalInterval.toString()}
                onValueChange={(value) => setGlobalInterval(Number(value) as 10 | 30 | 60 | 120)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="간격 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10분</SelectItem>
                  <SelectItem value="30">30분</SelectItem>
                  <SelectItem value="60">1시간</SelectItem>
                  <SelectItem value="120">2시간</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500">전체 그리드의 기본 시간 간격입니다</p>
            </div>
            <div className="space-y-2 pt-4 border-t border-zinc-200">
              <div className="flex items-center justify-between">
                <Label>예외 간격 규칙</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddException}
                  className="h-7 text-xs rounded-lg bg-transparent"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  규칙 추가
                </Button>
              </div>
              <p className="text-xs text-zinc-500">특정 시간대에 다른 간격을 적용할 수 있습니다</p>

              {exceptionRules.length > 0 && (
                <div className="space-y-3 mt-3">
                  {exceptionRules.map((rule) => {
                    const startTime = parseTime(rule.startTime)
                    const endTime = parseTime(rule.endTime)

                    return (
                      <div key={rule.id} className="p-3 border border-zinc-200 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-zinc-700">규칙</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveException(rule.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">시작 시간</Label>
                            <div className="flex gap-1">
                              <Select
                                value={startTime.hour.toString()}
                                onValueChange={(value) =>
                                  handleTimeChange(rule.id, "startTime", Number(value), startTime.minute)
                                }
                              >
                                <SelectTrigger className="h-8 text-xs rounded-lg">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <SelectItem key={i} value={i.toString()}>
                                      {i.toString().padStart(2, "0")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-xs flex items-center">:</span>
                              <Select
                                value={startTime.minute.toString()}
                                onValueChange={(value) =>
                                  handleTimeChange(rule.id, "startTime", startTime.hour, Number(value))
                                }
                              >
                                <SelectTrigger className="h-8 text-xs rounded-lg">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[0, 10, 20, 30, 40, 50].map((min) => (
                                    <SelectItem key={min} value={min.toString()}>
                                      {min.toString().padStart(2, "0")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">종료 시간</Label>
                            <div className="flex gap-1">
                              <Select
                                value={endTime.hour.toString()}
                                onValueChange={(value) =>
                                  handleTimeChange(rule.id, "endTime", Number(value), endTime.minute)
                                }
                              >
                                <SelectTrigger className="h-8 text-xs rounded-lg">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <SelectItem key={i} value={i.toString()}>
                                      {i.toString().padStart(2, "0")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-xs flex items-center">:</span>
                              <Select
                                value={endTime.minute.toString()}
                                onValueChange={(value) =>
                                  handleTimeChange(rule.id, "endTime", endTime.hour, Number(value))
                                }
                              >
                                <SelectTrigger className="h-8 text-xs rounded-lg">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[0, 10, 20, 30, 40, 50].map((min) => (
                                    <SelectItem key={min} value={min.toString()}>
                                      {min.toString().padStart(2, "0")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">간격</Label>
                          <Select
                            value={rule.interval.toString()}
                            onValueChange={(value) => handleUpdateException(rule.id, "interval", Number(value))}
                          >
                            <SelectTrigger className="h-8 text-xs rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">분할 없음</SelectItem>
                              <SelectItem value="10">10분</SelectItem>
                              <SelectItem value="30">30분</SelectItem>
                              <SelectItem value="60">1시간</SelectItem>
                              <SelectItem value="120">2시간</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
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
