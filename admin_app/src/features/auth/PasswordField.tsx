import { useState } from 'react'

interface PasswordFieldProps {
  label: string
  value: string
  placeholder: string
  autoComplete: string
  visible: boolean
  onChange: (value: string) => void
  onToggleVisibility: () => void
  minLength?: number
  maxLength?: number
}

export function PasswordField({
  label,
  value,
  placeholder,
  autoComplete,
  visible,
  onChange,
  onToggleVisibility,
  minLength,
  maxLength,
}: PasswordFieldProps) {
  return (
    <label className="change-password-label">
      {label}
      <span className="change-password-field">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          required
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </span>
    </label>
  )
}