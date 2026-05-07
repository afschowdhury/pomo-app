import { ArrowDown, ArrowUp, Check, Flag, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Surface } from '@/components/Surface';
import { cn } from '@/lib/utils';
import type { TaskItem } from '@/types/domain';

interface TaskPanelProps {
  tasks: TaskItem[];
  onAddTask: (payload: { title: string; estimatePomodoros: number }) => void;
  onActivateTask: (id: string) => void;
  onCompleteTask: (id: string) => void;
  onMoveTask: (id: string, direction: -1 | 1) => void;
  onRemoveTask: (id: string) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onRemoveSubtask: (taskId: string, subtaskId: string) => void;
}

export function TaskPanel({
  tasks,
  onAddTask,
  onActivateTask,
  onCompleteTask,
  onMoveTask,
  onRemoveTask,
  onAddSubtask,
  onToggleSubtask,
  onRemoveSubtask,
}: TaskPanelProps) {
  const [title, setTitle] = useState('');
  const [estimate, setEstimate] = useState(1);
  const [subtaskDraftByTask, setSubtaskDraftByTask] = useState<Record<string, string>>({});
  const currentTask = tasks.find((task) => task.status === 'active') ?? null;
  const queue = tasks.filter((task) => task.status === 'queued');
  const completed = tasks.filter((task) => task.status === 'completed').slice(0, 4);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    onAddTask({
      title: title.trim(),
      estimatePomodoros: estimate,
    });
    setTitle('');
    setEstimate(1);
  };

  const handleSubtaskSubmit = (taskId: string, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const draft = subtaskDraftByTask[taskId] ?? '';
    if (!draft.trim()) {
      return;
    }
    onAddSubtask(taskId, draft.trim());
    setSubtaskDraftByTask((current) => ({ ...current, [taskId]: '' }));
  };

  const renderSubtasks = (task: TaskItem) => {
    const completedSubtasks = task.subtasks.filter((subtask) => subtask.completed).length;
    return (
      <div className="mt-3 space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-dusk/70">
          Subtasks {completedSubtasks}/{task.subtasks.length || 0}
        </p>
        {task.subtasks.length > 0 && (
          <ul className="space-y-2">
            {task.subtasks.map((subtask) => (
              <li
                key={subtask.id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-ink/10 bg-white/70 px-3 py-2"
              >
                <button
                  className="flex flex-1 items-center gap-2 text-left"
                  onClick={() => onToggleSubtask(task.id, subtask.id)}
                >
                  <span
                    className={cn(
                      'inline-flex h-5 w-5 items-center justify-center rounded-full border border-ink/25 text-xs',
                      subtask.completed && 'border-pine bg-[#e6f0ea] text-pine',
                    )}
                  >
                    {subtask.completed ? <Check size={12} /> : null}
                  </span>
                  <span className={cn('text-sm text-ink', subtask.completed && 'text-dusk line-through')}>
                    {subtask.title}
                  </span>
                </button>
                <button
                  className="rounded-full border border-ink/10 bg-white p-1.5 text-dusk transition hover:border-blush/40 hover:text-blush"
                  onClick={() => onRemoveSubtask(task.id, subtask.id)}
                  aria-label="Remove subtask"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <form className="flex gap-2" onSubmit={(event) => handleSubtaskSubmit(task.id, event)}>
          <input
            value={subtaskDraftByTask[task.id] ?? ''}
            onChange={(event) =>
              setSubtaskDraftByTask((current) => ({ ...current, [task.id]: event.target.value }))
            }
            placeholder="Add a subtask"
            className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-blush/50"
          />
          <button
            className="inline-flex items-center justify-center rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs uppercase tracking-[0.15em] text-dusk transition hover:border-pine/40 hover:text-pine"
            type="submit"
          >
            Add
          </button>
        </form>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Surface className="border-white/60 bg-white/70 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-dusk/70">Task queue</p>
            <h2 className="mt-2 font-display text-3xl text-ink">What deserves this session?</h2>
          </div>
          <span className="rounded-full bg-[#f2dfd5] px-3 py-2 text-xs uppercase tracking-[0.2em] text-blush">
            {tasks.filter((task) => task.status !== 'completed').length} in flow
          </span>
        </div>

        <form className="mt-6 grid gap-3 md:grid-cols-[1fr_120px_auto]" onSubmit={handleSubmit}>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Draft landing page hero"
            className="w-full rounded-2xl border border-ink/10 bg-[#fffaf3] px-4 py-3 text-sm text-ink outline-none transition focus:border-blush/50"
          />
          <input
            min={1}
            max={12}
            type="number"
            value={estimate}
            onChange={(event) => setEstimate(Number(event.target.value))}
            className="rounded-2xl border border-ink/10 bg-[#fffaf3] px-4 py-3 text-sm text-ink outline-none transition focus:border-blush/50"
          />
          <button
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-canvas transition hover:bg-pine"
            type="submit"
          >
            <Plus size={16} />
            Add task
          </button>
        </form>
      </Surface>

      <Surface className="border-white/60 bg-[rgba(255,255,255,0.68)] p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl text-ink">Current task</h3>
          <Flag size={18} className="text-blush" />
        </div>
        {currentTask ? (
          <article className="mt-4 rounded-[24px] border border-ink/10 bg-[#fffaf3] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-medium text-ink">{currentTask.title}</p>
                <p className="mt-1 text-sm text-dusk/75">
                  {currentTask.completedPomodoros}/{currentTask.estimatePomodoros} pomodoros completed
                </p>
                {renderSubtasks(currentTask)}
              </div>
              <button
                className="rounded-full bg-[#e6f0ea] p-2 text-pine transition hover:bg-[#d2e6da]"
                onClick={() => onCompleteTask(currentTask.id)}
                aria-label="Complete task"
              >
                <Check size={16} />
              </button>
            </div>
          </article>
        ) : (
          <p className="mt-4 rounded-[24px] border border-dashed border-ink/10 bg-[#fffaf3] p-4 text-sm text-dusk/80">
            Add a task to anchor the next focus block.
          </p>
        )}
      </Surface>

      <Surface className="border-white/60 bg-[rgba(255,255,255,0.68)] p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl text-ink">Next up</h3>
          <span className="text-sm text-dusk/75">{queue.length} queued</span>
        </div>
        <div className="mt-4 space-y-3">
          {queue.length === 0 ? (
            <p className="rounded-[24px] border border-dashed border-ink/10 bg-[#fffaf3] p-4 text-sm text-dusk/80">
              The queue is clear. Leave it that way or stage your next few blocks.
            </p>
          ) : (
            queue.map((task, index) => (
              <article
                key={task.id}
                className={cn(
                  'rounded-[24px] border border-ink/10 bg-[#fffaf3] p-4 transition',
                  index === 0 && 'border-blush/20',
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-ink">{task.title}</p>
                    <p className="mt-1 text-sm text-dusk/75">
                      {task.completedPomodoros}/{task.estimatePomodoros} pomodoros completed
                    </p>
                    {renderSubtasks(task)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-full border border-ink/10 bg-white p-2 text-dusk transition hover:border-blush/40 hover:text-blush"
                      onClick={() => onMoveTask(task.id, -1)}
                      aria-label="Move task up"
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      className="rounded-full border border-ink/10 bg-white p-2 text-dusk transition hover:border-blush/40 hover:text-blush"
                      onClick={() => onMoveTask(task.id, 1)}
                      aria-label="Move task down"
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      className="rounded-full border border-ink/10 bg-white px-3 py-2 text-xs uppercase tracking-[0.2em] text-dusk transition hover:border-pine/40 hover:text-pine"
                      onClick={() => onActivateTask(task.id)}
                    >
                      Make current
                    </button>
                    <button
                      className="rounded-full border border-ink/10 bg-white p-2 text-dusk transition hover:border-blush/40 hover:text-blush"
                      onClick={() => onRemoveTask(task.id)}
                      aria-label="Remove task"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </Surface>

      {completed.length > 0 && (
        <Surface className="border-white/60 bg-[rgba(255,255,255,0.55)] p-5">
          <h3 className="font-display text-2xl text-ink">Recently finished</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {completed.map((task) => (
              <span
                key={task.id}
                className="rounded-full border border-pine/15 bg-[#e9f1ec] px-3 py-2 text-sm text-pine"
              >
                {task.title}
              </span>
            ))}
          </div>
        </Surface>
      )}
    </div>
  );
}
