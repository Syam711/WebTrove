export default function Toast({ toast, onClose }) {
  if (!toast) return null
  return (
    <div role="status"
      className="enter fixed inset-x-4 bottom-24 z-30 mx-auto flex max-w-md items-center justify-between gap-4 rounded-md bg-ink px-4 py-3 text-[14px] text-paper md:bottom-8">
      <span>{toast.text}</span>
      <span className="flex shrink-0 items-center gap-3">
        {toast.action && (
          <button onClick={() => { toast.action.run(); onClose() }} className="font-medium underline underline-offset-4">
            {toast.action.label}
          </button>
        )}
        <button onClick={onClose} aria-label="Dismiss" className="opacity-70 hover:opacity-100">✕</button>
      </span>
    </div>
  )
}
