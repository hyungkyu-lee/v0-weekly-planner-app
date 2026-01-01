"use client"

import type { Task } from "@/lib/types"
import { format, parseISO } from "date-fns"

interface TaskCardProps {
  task: Task
  onUpdate: (task: Task) => Promise<void>
  taskHeight: number
  onClick: (task: Task) => void
}

export function TaskCard({ task, taskHeight, onClick }: TaskCardProps) {
  const getTextColor = (bgColor: string) => {
    const hex = bgColor.replace("#", "")
    const r = Number.parseInt(hex.substr(0, 2), 16)
    const g = Number.parseInt(hex.substr(2, 2), 16)
    const b = Number.parseInt(hex.substr(4, 2), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 155 ? "#18181b" : "#ffffff"
  }

  const textColor = getTextColor(task.color)

  const CELL_HEIGHT = 27
  const slotCount = Math.floor(taskHeight / CELL_HEIGHT)

  const renderTaskContent = () => {
    const startTime = format(parseISO(task.start_time), "HH:mm")
    const endTime = format(parseISO(task.end_time), "HH:mm")
    const timeRange = `${startTime} ~ ${endTime}`

    if (slotCount <= 1) {
      return (
        <div className="flex items-center justify-center h-full px-1">
          <h4
            className={`text-xs font-medium truncate text-center ${task.is_done ? "line-through" : ""}`}
            style={{ color: textColor }}
          >
            {task.title}
          </h4>
        </div>
      )
    } else if (slotCount === 2) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-0.5 px-1">
          <h4
            className={`text-xs font-medium truncate text-center w-full ${task.is_done ? "line-through" : ""}`}
            style={{ color: textColor }}
          >
            {task.title}
          </h4>
          <p className="text-[10px] opacity-75" style={{ color: textColor }}>
            {timeRange}
          </p>
        </div>
      )
    } else {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-0.5 px-2">
          <h4
            className={`text-sm font-medium truncate text-center w-full ${task.is_done ? "line-through" : ""}`}
            style={{ color: textColor }}
          >
            {task.title}
          </h4>
          <p className="text-[10px] opacity-75" style={{ color: textColor }}>
            {timeRange}
          </p>
          {task.memo && (
            <p className="text-[9px] opacity-60 line-clamp-2 text-center w-full" style={{ color: textColor }}>
              {task.memo}
            </p>
          )}
        </div>
      )
    }
  }

  return (
    <div
      className={`h-full w-full transition-all duration-200 hover:scale-[1.005] cursor-pointer border-l-2 border-r border-zinc-200 relative ${
        task.is_done ? "opacity-60" : ""
      }`}
      style={{
        backgroundColor: task.color,
        borderLeftColor: task.color,
        filter: "brightness(0.95)",
      }}
      onClick={() => onClick(task)}
    >
      {renderTaskContent()}
    </div>
  )
}
