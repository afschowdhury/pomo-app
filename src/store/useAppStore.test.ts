import { describe, expect, it } from 'vitest';
import type { TaskItem } from '@/types/domain';
import {
  addSubtaskToTask,
  normalizeTask,
  removeTaskSubtask,
  toggleTaskSubtask,
} from '@/store/useAppStore';

function createTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 'task-1',
    title: 'Parent task',
    notes: '',
    estimatePomodoros: 3,
    completedPomodoros: 1,
    subtasks: [],
    status: 'active',
    order: 0,
    createdAt: 10,
    updatedAt: 10,
    ...overrides,
  };
}

describe('task subtask helpers', () => {
  it('normalizes a legacy task by adding subtasks', () => {
    const legacyTask = {
      id: 'task-legacy',
      title: 'Legacy',
      notes: '',
      estimatePomodoros: 2,
      completedPomodoros: 0,
      status: 'queued',
      order: 1,
      createdAt: 1,
      updatedAt: 1,
    } as TaskItem;

    const normalized = normalizeTask(legacyTask);
    expect(normalized.subtasks).toEqual([]);
  });

  it('adds a new subtask without changing pomodoro progress fields', () => {
    const task = createTask();
    const updated = addSubtaskToTask(task, 'Outline copy', 100);

    expect(updated.subtasks).toHaveLength(1);
    expect(updated.subtasks[0]).toMatchObject({
      title: 'Outline copy',
      completed: false,
      createdAt: 100,
      updatedAt: 100,
    });
    expect(updated.subtasks[0].id.startsWith('subtask-')).toBe(true);
    expect(updated.estimatePomodoros).toBe(task.estimatePomodoros);
    expect(updated.completedPomodoros).toBe(task.completedPomodoros);
  });

  it('toggles an existing subtask completion', () => {
    const task = createTask({
      subtasks: [
        { id: 'sub-1', title: 'Research', completed: false, createdAt: 1, updatedAt: 1 },
        { id: 'sub-2', title: 'Draft', completed: false, createdAt: 2, updatedAt: 2 },
      ],
    });

    const updated = toggleTaskSubtask(task, 'sub-2', 200);

    expect(updated.subtasks.map((subtask) => subtask.completed)).toEqual([false, true]);
    expect(updated.subtasks[1].updatedAt).toBe(200);
    expect(updated.completedPomodoros).toBe(task.completedPomodoros);
  });

  it('removes a subtask by id', () => {
    const task = createTask({
      subtasks: [
        { id: 'sub-1', title: 'Research', completed: true, createdAt: 1, updatedAt: 3 },
        { id: 'sub-2', title: 'Draft', completed: false, createdAt: 2, updatedAt: 2 },
      ],
    });

    const updated = removeTaskSubtask(task, 'sub-1', 300);

    expect(updated.subtasks).toEqual([{ id: 'sub-2', title: 'Draft', completed: false, createdAt: 2, updatedAt: 2 }]);
    expect(updated.updatedAt).toBe(300);
    expect(updated.estimatePomodoros).toBe(task.estimatePomodoros);
  });
});
