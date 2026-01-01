"use client"

import { useAuth } from "@/components/auth-provider"
import { WeeklyPlanner } from "@/components/weekly-planner"
import { createClient } from "@/lib/supabase/client"
import type { Task } from "@/lib/types"
import { useEffect, useReducer } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type State = {
  tasks: Task[]
  isLoading: boolean
}

type Action =
  | { type: "LOADING" }
  | { type: "TASKS_LOADED"; tasks: Task[] }
  | { type: "TASK_ADDED"; task: Task }
  | { type: "TASK_UPDATED"; task: Task }
  | { type: "TASK_DELETED"; taskId: string }
  | { type: "TASKS_CLEARED" }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOADING":
      return { ...state, isLoading: true }
    case "TASKS_LOADED":
      return { tasks: action.tasks, isLoading: false }
    case "TASK_ADDED":
      return { ...state, tasks: [...state.tasks, action.task] }
    case "TASK_UPDATED":
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.task.id ? action.task : t)),
      }
    case "TASK_DELETED":
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.taskId),
      }
    case "TASKS_CLEARED":
      return { ...state, tasks: [] }
    default:
      return state
  }
}

export default function PlannerPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [state, dispatch] = useReducer(reducer, { tasks: [], isLoading: true })

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login")
    }
  }, [user, authLoading])

  useEffect(() => {
    if (!user) return

    const supabase = createClient()
    let isSubscribed = true

    const fetchTasks = async () => {
      try {
        const { data, error } = await supabase.from("tasks").select("*").order("start_time", { ascending: true })

        if (!isSubscribed) return

        if (error) {
          console.error("Error fetching tasks:", error)
          dispatch({ type: "TASKS_LOADED", tasks: [] })
        } else {
          dispatch({ type: "TASKS_LOADED", tasks: data || [] })
        }
      } catch (err) {
        console.error("Fatal error fetching tasks:", err)
        if (isSubscribed) {
          dispatch({ type: "TASKS_LOADED", tasks: [] })
        }
      }
    }

    fetchTasks()

    const channel = supabase
      .channel("tasks-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        if (!isSubscribed) return

        if (payload.eventType === "INSERT") {
          dispatch({ type: "TASK_ADDED", task: payload.new as Task })
        } else if (payload.eventType === "UPDATE") {
          dispatch({ type: "TASK_UPDATED", task: payload.new as Task })
        } else if (payload.eventType === "DELETE") {
          dispatch({ type: "TASK_DELETED", taskId: (payload.old as Task).id })
        }
      })
      .subscribe()

    return () => {
      isSubscribed = false
      supabase.removeChannel(channel)
    }
  }, [user])

  const handleTaskAdd = async (task: Omit<Task, "id" | "created_at" | "updated_at">) => {
    try {
      const supabase = createClient()

      const tempId = `temp-${Date.now()}`
      const tempTask = {
        ...task,
        id: tempId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Task

      dispatch({ type: "TASK_ADDED", task: tempTask })

      const { data, error } = await supabase.from("tasks").insert(task).select().single()

      if (error) {
        dispatch({ type: "TASK_DELETED", taskId: tempId })
        console.error("Error adding task:", error)
        toast.error("일정 추가에 실패했습니다: " + error.message)
      } else {
        dispatch({ type: "TASK_UPDATED", task: data })
        toast.success("일정이 추가되었습니다", { duration: 1000 })
      }
    } catch (err) {
      console.error("Fatal error adding task:", err)
      toast.error("일정 추가 중 오류가 발생했습니다.")
    }
  }

  const handleTaskUpdate = async (task: Task, updateMode: "single" | "all" = "single") => {
    try {
      const supabase = createClient()

      if (updateMode === "all" && task.group_id) {
        const { error } = await supabase
          .from("tasks")
          .update({
            title: task.title,
            memo: task.memo,
            color: task.color,
            is_important: task.is_important,
            updated_at: new Date().toISOString(),
          })
          .eq("group_id", task.group_id)

        if (error) {
          console.error("Error updating recurring group:", error)
          toast.error("반복 일정 수정에 실패했습니다.")
        } else {
          toast.success("반복 일정이 모두 수정되었습니다", { duration: 1000 })
        }
      } else {
        const { error } = await supabase
          .from("tasks")
          .update({
            title: task.title,
            start_time: task.start_time,
            end_time: task.end_time,
            is_done: task.is_done,
            memo: task.memo,
            color: task.color,
            task_type: task.task_type,
            event_date: task.event_date,
            is_important: task.is_important,
            repeat_days: task.repeat_days,
            group_id: updateMode === "single" ? null : task.group_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", task.id)

        if (error) {
          console.error("Error updating task:", error)
          toast.error("일정 수정에 실패했습니다.")
        } else {
          toast.success("일정이 수정되었습니다", { duration: 1000 })
        }
      }
    } catch (err) {
      console.error("Fatal error updating task:", err)
      toast.error("일정 수정 중 오류가 발생했습니다.")
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    try {
      const deletedTask = state.tasks.find((t) => t.id === taskId)
      dispatch({ type: "TASK_DELETED", taskId })

      const supabase = createClient()
      const { error } = await supabase.from("tasks").delete().eq("id", taskId)

      if (error) {
        console.error("Error deleting task:", error)
        if (deletedTask) {
          dispatch({ type: "TASK_ADDED", task: deletedTask })
        }
        toast.error("일정 삭제에 실패했습니다.")
      } else {
        toast.success("일정이 삭제되었습니다", { duration: 1000 })
      }
    } catch (err) {
      console.error("Fatal error deleting task:", err)
      toast.error("일정 삭제 중 오류가 발생했습니다.")
    }
  }

  const handleRecurringGroupDelete = async (groupId: string) => {
    try {
      const deletedTasks = state.tasks.filter((t) => t.group_id === groupId)
      deletedTasks.forEach((t) => dispatch({ type: "TASK_DELETED", taskId: t.id }))

      const supabase = createClient()
      const { error } = await supabase.from("tasks").delete().eq("group_id", groupId)

      if (error) {
        console.error("Error deleting recurring group:", error)
        deletedTasks.forEach((t) => dispatch({ type: "TASK_ADDED", task: t }))
        toast.error("반복 일정 삭제에 실패했습니다.")
      } else {
        toast.success("반복 일정이 모두 삭제되었습니다", { duration: 1000 })
      }
    } catch (err) {
      console.error("Fatal error deleting recurring group:", err)
      toast.error("반복 일정 삭제 중 오류가 발생했습니다.")
    }
  }

  const handleDeleteAllTasks = async () => {
    try {
      const supabase = createClient()

      const deletedTasks = [...state.tasks]
      dispatch({ type: "TASKS_CLEARED" })

      const { error } = await supabase.from("tasks").delete().neq("id", "00000000-0000-0000-0000-000000000000")

      if (error) {
        console.error("Error deleting all tasks:", error)
        deletedTasks.forEach((t) => dispatch({ type: "TASK_ADDED", task: t }))
        toast.error("모든 일정 삭제에 실패했습니다.")
      } else {
        toast.success("모든 일정이 삭제되었습니다", { duration: 1000 })
      }
    } catch (err) {
      console.error("Fatal error deleting all tasks:", err)
      toast.error("일정 삭제 중 오류가 발생했습니다.")
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace("/auth/login")
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 mx-auto mb-4" />
          <p className="text-zinc-600">인증 확인 중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 mx-auto mb-4" />
          <p className="text-zinc-600">일정 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-50">
      <WeeklyPlanner
        tasks={state.tasks}
        onTaskAdd={handleTaskAdd}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={handleTaskDelete}
        onDeleteRecurringGroup={handleRecurringGroupDelete}
        onDeleteAllTasks={handleDeleteAllTasks}
        onSignOut={handleSignOut}
      />
    </div>
  )
}
