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
  const [focused, setFocused] = useState(false)
  const [rawValue, setRawValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFocus = useCallback(() => {
    setFocused(true)
    setRawValue(value ? String(value) : '')
  }, [value])

  const handleBlur = useCallback(() => {
    setFocused(false)
    const parsed = parseFloat(rawValue.replace(',', '.')) || 0
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

  if (!value && erlassen && onErlassen) {
    return (
      <div className="erlassen-wrapper">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={focused ? rawValue : ''}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
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
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={focused ? rawValue : (value ? formatCurrency(value) : '')}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      placeholder={placeholder}
    />
  )
}
