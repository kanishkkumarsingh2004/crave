import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { useEffect, useRef, useState } from 'react'

interface BarcodeScannerProps {
  onClose: () => void
  onDetected: (barcode: string) => void
}

const READER_ID = 'crave-admin-barcode-reader'

const PRODUCT_BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.QR_CODE,
]

function cameraErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '')
  if (/permission|notallowed|denied/i.test(message)) {
    return 'Camera permission was denied. Allow camera access for Crave Admin, then try again.'
  }
  if (/notfound|devicesnotfound|no camera/i.test(message)) {
    return 'No camera was found on this device.'
  }
  if (/notreadable|trackstart|could not start/i.test(message)) {
    return 'The camera is being used by another app. Close it there and try again.'
  }
  return 'The camera could not be opened. Check the app permission and try again.'
}

export default function BarcodeScanner({ onClose, onDetected }: BarcodeScannerProps) {
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const detectedRef = useRef(false)
  const onDetectedRef = useRef(onDetected)

  onDetectedRef.current = onDetected

  useEffect(() => {
    let disposed = false
    detectedRef.current = false
    setError('')
    setStarting(true)

    const scanner = new Html5Qrcode(READER_ID, {
      formatsToSupport: PRODUCT_BARCODE_FORMATS,
      useBarCodeDetectorIfSupported: true,
      verbose: false,
    })

    // Deferring one task prevents React StrictMode's development-only probe
    // mount from opening the camera before that probe is cleaned up.
    const startTimer = window.setTimeout(() => {
      void scanner
        .start(
          { facingMode: { ideal: 'environment' } },
          {
            fps: 10,
            aspectRatio: 16 / 9,
            qrbox: (viewWidth, viewHeight) => ({
              width: Math.min(Math.floor(viewWidth * 0.88), 380),
              height: Math.min(Math.max(Math.floor(viewHeight * 0.3), 90), 145),
            }),
          },
          (decodedText) => {
            const barcode = decodedText.trim()
            if (disposed || detectedRef.current || !barcode) return
            detectedRef.current = true
            navigator.vibrate?.(80)
            onDetectedRef.current(barcode)
          },
          () => undefined
        )
        .then(() => {
          if (disposed && scanner.isScanning) void scanner.stop().catch(() => undefined)
          if (!disposed) setStarting(false)
        })
        .catch((scanError) => {
          if (!disposed) {
            setStarting(false)
            setError(cameraErrorMessage(scanError))
          }
        })
    }, 0)

    return () => {
      disposed = true
      window.clearTimeout(startTimer)
      const clear = () => {
        try {
          scanner.clear()
        } catch {
          // The reader element may already be gone while the sheet is closing.
        }
      }
      if (scanner.isScanning)
        void scanner
          .stop()
          .catch(() => undefined)
          .then(clear)
      else clear()
    }
  }, [attempt])

  return (
    <div className="barcode-scanner-backdrop" role="presentation">
      <section
        className="barcode-scanner-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="barcode-scanner-title"
      >
        <div className="barcode-scanner-heading">
          <div>
            <span className="eyebrow">Product camera</span>
            <h2 id="barcode-scanner-title">Scan product barcode</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close barcode scanner">
            ×
          </button>
        </div>

        <div className="barcode-reader-frame">
          <div id={READER_ID} />
          {starting && !error && <div className="barcode-camera-status">Starting camera…</div>}
          {error && (
            <div className="barcode-camera-error" role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => setAttempt((value) => value + 1)}>
                Try again
              </button>
            </div>
          )}
        </div>

        <p className="barcode-scanner-help">
          Hold the package steady and place the barcode inside the frame. It will be entered
          automatically.
        </p>
        <button type="button" className="secondary-button barcode-cancel" onClick={onClose}>
          Cancel scan
        </button>
      </section>
    </div>
  )
}
