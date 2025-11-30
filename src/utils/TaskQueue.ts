import { EventEmitter } from 'events'
import { BotTask, TaskPriority, TaskStatus } from '../types'

export class TaskQueue extends EventEmitter {
  private tasks: Map<string, BotTask> = new Map()
  private pendingTasks: BotTask[] = []
  private runningTask: BotTask | null = null
  private processing: boolean = false

  addTask(type: string, data: any, priority: TaskPriority = 'normal', maxRetries: number = 3): string {
    const task: BotTask = {
      id: this.generateTaskId(),
      type,
      priority,
      status: 'pending',
      data,
      createdAt: Date.now(),
      retries: 0,
      maxRetries,
    }

    this.tasks.set(task.id, task)
    this.pendingTasks.push(task)
    this.sortPendingTasks()

    this.emit('taskAdded', task)
    this.processNext()

    return task.id
  }

  removeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId)
    if (!task) return false

    if (task.status === 'running') {
      task.status = 'cancelled'
      this.emit('taskCancelled', task)
    }

    this.tasks.delete(taskId)
    this.pendingTasks = this.pendingTasks.filter(t => t.id !== taskId)

    return true
  }

  getTask(taskId: string): BotTask | undefined {
    return this.tasks.get(taskId)
  }

  getCurrentTask(): BotTask | null {
    return this.runningTask
  }

  getPendingTasks(): BotTask[] {
    return [...this.pendingTasks]
  }

  getAllTasks(): BotTask[] {
    return Array.from(this.tasks.values())
  }

  async completeTask(taskId: string, success: boolean, reason?: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) return

    if (success) {
      task.status = 'completed'
      task.completedAt = Date.now()
      this.emit('taskCompleted', task)
    } else {
      if (task.retries < task.maxRetries) {
        // Retry the task
        task.retries++
        task.status = 'pending'
        task.failedReason = reason
        this.pendingTasks.push(task)
        this.sortPendingTasks()
        this.emit('taskRetry', task)
      } else {
        // Task failed permanently
        task.status = 'failed'
        task.completedAt = Date.now()
        task.failedReason = reason
        this.emit('taskFailed', task)
      }
    }

    if (this.runningTask?.id === taskId) {
      this.runningTask = null
    }

    this.processNext()
  }

  clear(): void {
    this.tasks.clear()
    this.pendingTasks = []
    this.runningTask = null
    this.processing = false
  }

  private sortPendingTasks(): void {
    const priorityOrder: { [key in TaskPriority]: number } = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
    }

    this.pendingTasks.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      return a.createdAt - b.createdAt
    })
  }

  private processNext(): void {
    if (this.processing || this.runningTask) return

    const nextTask = this.pendingTasks.shift()
    if (!nextTask) return

    this.processing = true
    this.runningTask = nextTask
    nextTask.status = 'running'
    nextTask.startedAt = Date.now()

    this.emit('taskStarted', nextTask)
    this.processing = false
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
