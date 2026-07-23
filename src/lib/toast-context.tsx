import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Undo2 } from 'lucide-react'

/** How long a delete stays undoable, and how long its toast stays on screen — kept as one
 * constant so the store's deferred-delete timer and the toast's own dismiss timer never drift
 * apart (the toast disappearing is the user's only signal that undo is no longer possible). */
export const UNDO_WINDOW_MS = 6500

interface UndoToast {
  id: string
  message: string
  onUndo: () => void
}

interface ToastContextValue {
  /** Shows a message with an Undo button for UNDO_WINDOW_MS, then auto-dismisses. */
  showUndoToast: (message: string, onUndo: () => void) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Array<UndoToast>>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showUndoToast = useCallback((message: string, onUndo: () => void) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [...prev, { id, message, onUndo }])
    const timer = setTimeout(() => {
      timers.current.delete(id)
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, UNDO_WINDOW_MS)
    timers.current.set(id, timer)
  }, [])

  return (
    <ToastContext.Provider value={{ showUndoToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="charm-glass-solid pointer-events-auto flex items-center gap-3 rounded-full py-2 pl-4 pr-2 shadow-lg"
          >
            <p className="text-sm text-[var(--charm-ink)]">{toast.message}</p>
            <button
              type="button"
              onClick={() => {
                toast.onUndo()
                dismiss(toast.id)
              }}
              className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--accent-foreground)] transition duration-150 ease-out hover:opacity-90 active:scale-95"
            >
              <Undo2 className="size-3.5" /> Undo
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
