'use client'

/**
 * LanguageSwitcher
 * ─────────────────────────────────────────────────────────────
 * A compact dropdown that lets any authenticated (or guest) user
 * switch between supported locales.
 *
 * Props
 * ─────
 * variant  — "pill"   (default) compact pill shown in headers/navbars
 *          — "menu"   full-width row used inside settings pages
 *          — "inline" icon-only button, label in tooltip
 *
 * On change:
 *  1. Updates context + localStorage instantly (optimistic).
 *  2. Persists to DB if the user is logged in (via auth token).
 */

import { SUPPORTED_LANGUAGES } from '@/dictionary'
import type { SupportedLocale } from '@/dictionary'
import { useAuth } from '@/lib/auth-context'
import { useLanguage } from '@/lib/language-context'
import { Check, ChevronDown, Globe } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────

interface LanguageSwitcherProps {
  variant?: 'pill' | 'menu' | 'inline'
  /** Override Tailwind classes on the trigger button */
  className?: string
}

// ── Component ─────────────────────────────────────────────────

export default function LanguageSwitcher({
  variant = 'pill',
  className = '',
}: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLanguage()
  const { token } = useAuth()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === locale) ?? SUPPORTED_LANGUAGES[0]

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  async function handleSelect(code: SupportedLocale) {
    if (code === locale) {
      setOpen(false)
      return
    }
    setSaving(true)
    setOpen(false)
    await setLocale(code, token)
    setSaving(false)
  }

  // ── Variants ─────────────────────────────────────────────────

  // Pill — compact, sits in headers
  if (variant === 'pill') {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={t.language.selectLanguage}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="flex items-center gap-1.5 rounded-full border border-[#dfe4dc] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#18201c] transition hover:bg-[#f3f6ee] active:scale-95"
        >
          <Globe className="size-3.5 text-[#859d19] shrink-0" />
          <span className="hidden sm:inline">
            {saving ? t.language.saving : currentLang.nativeName}
          </span>
          <span className="sm:hidden">{currentLang.flag}</span>
          <ChevronDown
            className={`size-3 text-[#88928a] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div
            role="listbox"
            aria-label={t.language.selectLanguage}
            className="absolute right-0 top-9 z-[200] min-w-[160px] rounded-2xl border border-[#e2e6df] bg-white p-1.5 shadow-2xl"
          >
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isActive = lang.code === locale
              return (
                <button
                  key={lang.code}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelect(lang.code)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    isActive ? 'bg-[#d9f447] text-[#18201c]' : 'text-[#2d3732] hover:bg-[#f3f6ee]'
                  }`}
                >
                  <span className="text-sm">{lang.flag}</span>
                  <span className="flex-1 text-left">{lang.nativeName}</span>
                  <span className="text-[10px] text-[#78827c] font-normal">{lang.name}</span>
                  {isActive && <Check className="size-3.5 text-[#5a6e0c] shrink-0" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Menu — full row used in settings pages
  if (variant === 'menu') {
    return (
      <div ref={containerRef} className={`relative ${className}`}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={t.language.selectLanguage}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="flex w-full items-center justify-between rounded-2xl border border-[#e2e7de] bg-white px-4 py-3.5 text-sm font-semibold text-[#18201c] transition hover:bg-[#f6f9f2] hover:border-[#c8d49e]"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#f0f5db] text-base">
              {currentLang.flag}
            </span>
            <div className="text-left">
              <p className="text-sm font-bold text-[#18201c]">{currentLang.nativeName}</p>
              <p className="text-[11px] text-[#78827c]">{t.settings.languageDescription}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saving && <span className="text-[11px] text-[#78827c]">{t.language.saving}</span>}
            <ChevronDown
              className={`size-4 text-[#88928a] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {open && (
          <div
            role="listbox"
            aria-label={t.language.selectLanguage}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-[200] rounded-2xl border border-[#e2e6df] bg-white p-1.5 shadow-2xl"
          >
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isActive = lang.code === locale
              return (
                <button
                  key={lang.code}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelect(lang.code)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    isActive ? 'bg-[#d9f447] text-[#18201c]' : 'text-[#2d3732] hover:bg-[#f3f6ee]'
                  }`}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span className="flex-1 text-left">{lang.nativeName}</span>
                  <span className="text-xs text-[#78827c] font-normal">{lang.name}</span>
                  {isActive && <Check className="size-4 text-[#5a6e0c] shrink-0" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Inline — icon-only, tooltip on hover (sidebars / collapsed nav)
  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        title={`${t.language.currentLanguage}: ${currentLang.nativeName}`}
        aria-label={t.language.selectLanguage}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="group relative grid size-9 place-items-center rounded-xl border border-[#dfe4dc] bg-white text-[#18201c] transition hover:bg-[#f3f6ee] active:scale-95"
      >
        <Globe className="size-4 text-[#859d19]" />
        {/* tiny locale badge */}
        <span className="absolute -bottom-1 -right-1 rounded-full bg-[#d9f447] px-1 py-px text-[8px] font-bold text-[#18201c] leading-none uppercase">
          {locale}
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t.language.selectLanguage}
          className="absolute left-0 top-11 z-[200] min-w-[160px] rounded-2xl border border-[#e2e6df] bg-white p-1.5 shadow-2xl"
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isActive = lang.code === locale
            return (
              <button
                key={lang.code}
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(lang.code)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  isActive ? 'bg-[#d9f447] text-[#18201c]' : 'text-[#2d3732] hover:bg-[#f3f6ee]'
                }`}
              >
                <span className="text-sm">{lang.flag}</span>
                <span className="flex-1 text-left">{lang.nativeName}</span>
                {isActive && <Check className="size-3.5 text-[#5a6e0c] shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
