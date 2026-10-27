'use client'

import React, { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Camera, ScanLine, X } from 'lucide-react'

interface CameraBarcodeScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScan: (code: string) => void
  title?: string
}

export default function CameraBarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Product Barcode',
}: CameraBarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState('')
  const [cameraError, setCameraError] = useState('')
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string>('')
  const scannerRef = useRef<any>(null)

  useEffect(() => {
    if (!isOpen) return
    let isCancelled = false
    setCameraError('')

    const initScanner = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
        if (isCancelled) return

        const element = document.getElementById('camera-reader-view')
        if (!element) return

        if (scannerRef.current) {
          try {
            if (scannerRef.current.isScanning) {
              await scannerRef.current.stop()
            }
          } catch {}
        }

        const html5Qrcode = new Html5Qrcode('camera-reader-view')
        scannerRef.current = html5Qrcode

        const availableCams = await Html5Qrcode.getCameras()
        if (availableCams && availableCams.length > 0) {
          setCameras(availableCams)
        }

        let targetCamera: any = selectedCameraId
        if (!targetCamera && availableCams && availableCams.length > 0) {
          const backCam = availableCams.find(
            (c) =>
              c.label.toLowerCase().includes('back') ||
              c.label.toLowerCase().includes('rear') ||
              c.label.toLowerCase().includes('environment')
          )
          targetCamera = backCam ? backCam.id : availableCams[0].id
          setSelectedCameraId(targetCamera)
        }

        if (!targetCamera) {
          targetCamera = { facingMode: 'environment' }
        }

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => ({
            width: Math.floor(viewfinderWidth * 0.85),
            height: Math.floor(viewfinderHeight * 0.65),
          }),
          aspectRatio: 1.333333,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        }

        const onScanSuccess = (decodedText: string) => {
          if (isCancelled) return
          isCancelled = true
          try {
            if (scannerRef.current && scannerRef.current.isScanning) {
              scannerRef.current.stop().catch(() => {})
            }
          } catch {}
          onScan(decodedText)
        }

        try {
          await html5Qrcode.start(targetCamera, config, onScanSuccess, () => {})
        } catch (firstErr) {
          console.warn('Initial camera start failed, retrying default camera mode...', firstErr)
          await html5Qrcode.start({ facingMode: 'user' }, config, onScanSuccess, () => {})
        }
      } catch (err: any) {
        console.warn('Camera stream error:', err)
        if (!isCancelled) {
          setCameraError(
            'Camera permission is required or camera device was not found. Ensure camera access is allowed in browser settings or type barcode manually.'
          )
        }
      }
    }

    const timer = setTimeout(initScanner, 150)

    return () => {
      isCancelled = true
      clearTimeout(timer)
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {})
          }
        } catch {}
      }
    }
  }, [isOpen, selectedCameraId])

  if (!isOpen) return null

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {})
        }
      } catch {}
    }
    onScan(manualCode.trim())
    setManualCode('')
  }

  const handleClose = () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {})
        }
      } catch {}
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Camera className="size-5 text-emerald-600" />
            <h3 className="font-bold text-base text-[#18201c]">{title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="grid size-8 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-3">
          Point device camera directly at the physical item&apos;s barcode or QR code.
        </p>

        {cameras.length > 1 && (
          <div className="mb-3">
            <label className="text-[10px] font-bold text-gray-500 block mb-1 uppercase tracking-wider">
              Select Camera Device:
            </label>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-2 text-xs outline-none bg-white font-medium text-[#18201c] cursor-pointer"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Camera ${c.id.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="relative min-h-[240px] rounded-2xl overflow-hidden bg-gray-950 flex items-center justify-center border border-gray-200">
          <div id="camera-reader-view" className="w-full h-full min-h-[240px]" />
          {cameraError && (
            <div className="absolute inset-0 p-4 bg-gray-950/90 text-white flex flex-col items-center justify-center text-center text-xs">
              <AlertTriangle className="size-8 text-amber-400 mb-2" />
              <p className="max-w-[260px] text-gray-300 font-medium mb-3">{cameraError}</p>
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-gray-100 pt-3">
          <label className="text-[11px] font-bold text-gray-500 block mb-1">
            Or type / paste Barcode manually:
          </label>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="e.g. 8901058852314"
              className="flex-1 rounded-xl border border-gray-200 p-2.5 text-xs font-mono outline-none focus:border-[#18201c]"
            />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-xl bg-[#18201c] px-4 py-2.5 text-xs font-bold text-[#d9f447] hover:bg-[#323f37] transition cursor-pointer"
            >
              <ScanLine className="size-3.5" />
              <span>Use Code</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
