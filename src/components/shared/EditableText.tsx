import { useState, useCallback, useRef, useEffect } from 'react'

interface EditableTextProps {
  value: string
  onSave: (value: string) => void
  className?: string
  inputClassName?: string
  type?: 'text' | 'date'
  placeholder?: string
}

const isTouchDevice = () => 'ontouchstart' in window

export function EditableText({
  value,
  onSave,
  className,
  inputClassName,
  type = 'text',
  placeholder,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      // Small delay for iOS to properly show keyboard
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [editing])

  const startEdit = useCallback(() => {
    setDraft(value)
    setEditing(true)
  }, [value])

  const save = useCallback(() => {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) {
      onSave(trimmed)
    }
  }, [draft, value, onSave])

  const cancel = useCallback(() => {
    setEditing(false)
    setDraft(value)
  }, [value])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') save()
      if (e.key === 'Escape') cancel()
    },
    [save, cancel]
  )

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        className={inputClassName}
        placeholder={placeholder}
      />
    )
  }

  return (
    <span
      className={className}
      onClick={isTouchDevice() ? startEdit : undefined}
      onDoubleClick={!isTouchDevice() ? startEdit : undefined}
      title={isTouchDevice() ? 'Tippen zum Bearbeiten' : 'Doppelklick zum Bearbeiten'}
      style={{ cursor: 'text' }}
    >
      {value}
    </span>
  )
}
