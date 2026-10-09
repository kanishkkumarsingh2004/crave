'use client'

import React, { useEffect, useState } from 'react'
import { Download, Share, PlusSquare, X, Smartphone, CheckCircle } from 'lucide-react'
import Image from 'next/image'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('crave_pwa_dismissed') === 'true'
    if (isDismissed) {
      setDismissed(true)
    }

    // Check if app is already running in standalone (installed) mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')

    if (isStandalone) {
      setIsInstalled(true)
      return
    }

    // Check if iOS device
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIos(isIosDevice)

    // Register service worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            // Check for updates
            registration.onupdatefound = () => {
              const installingWorker = registration.installing
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (
                    installingWorker.state === 'installed' &&
                    navigator.serviceWorker.controller
                  ) {
                    // New service worker installed
                  }
                }
              }
            }
          })
          .catch((err) => {
            console.error('PWA ServiceWorker registration failed:', err)
          })
      })
    }

    // Listen for beforeinstallprompt event (Chrome, Android, Edge, Opera)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      sessionStorage.removeItem('crave_pwa_dismissed')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // Listen to custom install trigger from buttons elsewhere in the app
    const handleTriggerInstall = () => {
      if (deferredPrompt) {
        handleInstallClick()
      } else if (isIosDevice) {
        setShowIosGuide(true)
      }
    }
    window.addEventListener('trigger-pwa-install', handleTriggerInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('trigger-pwa-install', handleTriggerInstall)
    }
  }, [deferredPrompt])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isIos) {
        setShowIosGuide(true)
      }
      return
    }

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setIsInstalled(true)
      }
      setDeferredPrompt(null)
      setIsInstallable(false)
    } catch (err) {
      console.error('Error prompting PWA install:', err)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('crave_pwa_dismissed', 'true')
  }

  // If already installed or dismissed, do not render banner
  if (isInstalled || dismissed) {
    return null
  }

  // Render on Android/Chrome when beforeinstallprompt fired, or on iOS when not installed
  if (!isInstallable && !isIos) {
    return null
  }

  return (
    <>
      {/* Floating Bottom Install Banner */}
      <div
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
        role="dialog"
        aria-label="Install App"
      >
        <div className="bg-[#18201c] text-white p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3 backdrop-blur-md">
          {/* App Logo */}
          <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center shrink-0 border border-white/5 overflow-hidden">
            {/* Crave mini icon */}
            <span className="text-white font-black text-2xl tracking-tighter inline-flex items-baseline">
              c<span className="w-1.5 h-1.5 bg-[#d9f447] rounded-sm ml-0.5" />
            </span>
          </div>

          {/* Text Details */}
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm tracking-tight text-white flex items-center gap-2 flex-wrap">
              <span>Install Crave App</span>
              <span className="inline-flex items-center text-[10px] bg-[#d9f447]/15 text-[#d9f447] font-bold px-2 py-0.5 rounded-full border border-[#d9f447]/30 whitespace-nowrap shrink-0 shadow-xs">
                Fast &amp; Free
              </span>
            </h4>
            <p className="text-xs text-white/70 truncate mt-0.5">
              {isIos
                ? 'Add to Home Screen for 1-tap food delivery'
                : 'Get instant CraveXP 10 Store delivery'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={isIos ? () => setShowIosGuide(true) : handleInstallClick}
              className="px-3.5 py-2 bg-[#d9f447] hover:bg-[#c8e434] active:scale-95 text-[#18201c] font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-md shadow-[#d9f447]/10"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-white/50 hover:text-white rounded-lg transition"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Add to Home Screen Instructions Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1e2621] border border-white/10 rounded-3xl p-6 max-w-sm w-full text-white shadow-2xl animate-in slide-in-from-bottom-6 duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/10">
                  <span className="text-white font-black text-xl">
                    c<span className="w-1 h-1 bg-[#d9f447] inline-block ml-0.5 rounded-xs" />
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Install Crave on iOS</h3>
                  <p className="text-xs text-white/60">Safari Home Screen Installation</p>
                </div>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="p-1 rounded-full text-white/60 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-white/80 mb-4">
              Apple Safari does not allow automatic 1-tap installation, but you can install Crave in
              seconds:
            </p>

            <div className="space-y-3 mb-6 text-sm">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Share className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <strong className="block text-white font-medium">1. Tap the Share button</strong>
                  <span className="text-white/60">
                    Located at the bottom of Safari navigation bar
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="w-7 h-7 rounded-lg bg-[#d9f447]/20 text-[#d9f447] flex items-center justify-center shrink-0 mt-0.5">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <strong className="block text-white font-medium">
                    2. Choose &quot;Add to Home Screen&quot;
                  </strong>
                  <span className="text-white/60">
                    Scroll down in the share sheet and tap the plus icon
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <strong className="block text-white font-medium">3. Tap &quot;Add&quot;</strong>
                  <span className="text-white/60">Tap Add in the top-right corner to finish</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3 bg-[#d9f447] text-[#18201c] font-bold text-sm rounded-xl hover:bg-[#c8e434] transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
