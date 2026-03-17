import { useState, useCallback, useRef } from 'react'
import { formatCurrency } from '../../utils/format'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
  erlassen?: boolean
  onErlassen?: () => void
}

export function CurrencyInput({ value, onChange, className, placeholder, erlassen, onErlassen }: CurrencyInputProps) {
  const [editing, setEditing] = useState(false)
  const [rawValue, setRawValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFocus = useCallback(() => {
    setEditing(true)
    setRawValue(value ? String(value) : '')
  }, [value])

  const handleBlur = useCallback(() => {
    setEditing(false)
    const parsed = parseFloat(rawValue) || 0
    onChange(parsed)
  }, [rawValue, onChange])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val === '' || /^[\d.,]*$/.test(val)) {
      setRawValue(val)
      const parsed = parseFloat(val.replace(',', '.')) || 0
      onChange(parsed)
    }
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur()
    }
  }, [])

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={rawValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={className}
        placeholder={placeholder}
        autoFocus
      />
    )
  }

  if (!value && erlassen && onErlassen) {
    return (
      <div className="erlassen-wrapper">
        <input
          type="text"
          value=""
          onFocus={handleFocus}
          readOnly
          className={className}
          placeholder={placeholder}
        />
        <button className="erlassen-link" onClick={onErlassen}>
          erlassen
        </button>
      </div>
    )
  }

  return (
    <input
      type="text"
      value={value ? formatCurrency(value) : ''}
      onFocus={handleFocus}
      readOnly
      className={className}
      placeholder={placeholder}
    />
  )
}
