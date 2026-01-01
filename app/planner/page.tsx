"use client"

import { useAuth } from "@/components/auth-provider"
import { WeeklyPlanner } from "@/components/weekly-planner"
import { createClient } from "@/lib/supabase/client"
import type { Task } from "@/lib/types"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

export default function PlannerPage() {
  const { user, loading, signOut } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchTasks()
      const cleanup = subscribeToTasks()
      return cleanup
    }
  }, [user])

  const fetchTasks = async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase.from("tasks").select("*").order("start_time", { ascending: true })

      if (error) {
        console.error("Error fetching tasks:", error)
      } else {
        setTasks(data || [])
      }
    } catch (err) {
      console.error("Fatal error fetching tasks:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const subscribeToTasks = () => {
    const supabase = createClient()

    const channel = supabase
      .channel("tasks-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setTasks((prev) => [...prev, payload.new as Task])
        } else if (payload.eventType === "UPDATE") {
          setTasks((prev) => prev.map((task) => (task.id === payload.new.id ? (payload.new as Task) : task)))
        } else if (payload.eventType === "DELETE") {
          setTasks((prev) => prev.filter((task) => task.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleTaskAdd = async (task: Omit<Task, "id" | "created_at" | "updated_at">) => {
    try {
      const supabase = createClient()

      // Optimistic update: add temporary task to UI immediately
      const tempId = `temp-${Date.now()}`
      const tempTask = {
        ...task,
        id: tempId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Task

      setTasks((prev) => [...prev, tempTask])

      const { data, error } = await supabase.from("tasks").insert(task).select().single()

      if (error) {
        // Rollback on error
        setTasks((prev) => prev.filter((t) => t.id !== tempId))
        console.error("Error adding task:", error)
        toast.error("일정 추가에 실패했습니다: " + error.message)
      } else {
        // Replace temp task with real one
        setTasks((prev) => prev.map((t) => (t.id === tempId ? data : t)))
        toast.success("일정이 추가되었습니다", { duration: 1500 })
      }
    } catch (err) {
      console.error("Fatal error adding task:", err)
      toast.error("일정 추가 중 오류가 발생했습니다.")
    }
  }

  const handleTaskUpdate = async (task: Task) => {
    try {
      const supabase = createClient()
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id)

      if (error) {
        console.error("Error updating task:", error)
        alert("일정 업데이트에 실패했습니다.")
      }
    } catch (err) {
      console.error("Fatal error updating task:", err)
    }
  }

  const handleTaskDelete = async (taskId: string) => {
    console.log("[v0] PlannerPage: handleTaskDelete called with taskId:", taskId)
    try {
      // Optimistic update: remove task from UI immediately
      const deletedTask = tasks.find((t) => t.id === taskId)
      console.log("[v0] PlannerPage: Found task to delete:", deletedTask)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))

      const supabase = createClient()
      console.log("[v0] PlannerPage: Calling Supabase delete for taskId:", taskId)
      const { error } = await supabase.from("tasks").delete().eq("id", taskId)

      if (error) {
        console.error("[v0] PlannerPage: Error deleting task:", error)
        // Rollback on error
        if (deletedTask) {
          setTasks((prev) => [...prev, deletedTask])
        }
        toast.error("일정 삭제에 실패했습니다.")
      } else {
        console.log("[v0] PlannerPage: Task deleted successfully")
        toast.success("일정이 삭제되었습니다", { duration: 1500 })
      }
    } catch (err) {
      console.error("[v0] PlannerPage: Fatal error deleting task:", err)
      toast.error("일정 삭제 중 오류가 발생했습니다.")
    }
  }

  const handleRecurringGroupDelete = async (groupId: string) => {
    console.log("[v0] PlannerPage: handleRecurringGroupDelete called with groupId:", groupId)
    try {
      // Optimistic update: remove all tasks with the same group_id from UI immediately
      const deletedTasks = tasks.filter((t) => t.group_id === groupId)
      console.log("[v0] PlannerPage: Found", deletedTasks.length, "tasks to delete in group")
      setTasks((prev) => prev.filter((t) => t.group_id !== groupId))

      const supabase = createClient()
      console.log("[v0] PlannerPage: Calling Supabase delete for groupId:", groupId)
      const { error } = await supabase.from("tasks").delete().eq("group_id", groupId)

      if (error) {
        console.error("[v0] PlannerPage: Error deleting recurring group:", error)
        // Rollback on error
        setTasks((prev) => [...prev, ...deletedTasks])
        toast.error("반복 일정 삭제에 실패했습니다.")
      } else {
        console.log("[v0] PlannerPage: Recurring group deleted successfully")
        toast.success("반복 일정이 모두 삭제되었습니다", { duration: 1500 })
      }
    } catch (err) {
      console.error("[v0] PlannerPage: Fatal error deleting recurring group:", err)
      toast.error("반복 일정 삭제 중 오류가 발생했습니다.")
    }
  }

  const handleDeleteAllTasks = async () => {
    try {
      const supabase = createClient()

      // Optimistic update: clear all tasks from UI immediately
      const deletedTasks = [...tasks]
      setTasks([])

      const { error } = await supabase.from("tasks").delete().neq("id", "00000000-0000-0000-0000-000000000000")

      if (error) {
        console.error("Error deleting all tasks:", error)
        // Rollback on error
        setTasks(deletedTasks)
        toast.error("모든 일정 삭제에 실패했습니다.")
      } else {
        toast.success("모든 일정이 삭제되었습니다", { duration: 1500 })
      }
    } catch (err) {
      console.error("Fatal error deleting all tasks:", err)
      toast.error("일정 삭제 중 오류가 발생했습니다.")
    }
  }

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 mx-auto mb-4" />
          <p className="text-zinc-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-50">
      {/* Planner */}
      <WeeklyPlanner
        tasks={tasks}
        onTaskAdd={handleTaskAdd}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={handleTaskDelete}
        onDeleteRecurringGroup={handleRecurringGroupDelete}
        onDeleteAllTasks={handleDeleteAllTasks}
        onSignOut={signOut}
      />
    </div>
  )
}
