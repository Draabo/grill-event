import { useState, useCallback } from 'react'
import './PayPalModal.css'

interface PayPalModalProps {
  personName: string
  amount: number
  paypalUsername: string
  onClose: () => void
}

export function PayPalModal({ personName, amount, paypalUsername, onClose }: PayPalModalProps) {
  const [copied, setCopied] = useState(false)

  const paypalLink = `https://paypal.me/${paypalUsername}/${amount.toFixed(2)}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paypalLink)}`

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(paypalLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [paypalLink])

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose]
  )

  return (
    <div className="paypal-modal-backdrop" onClick={handleBackdrop}>
      <div className="paypal-modal">
        <div className="paypal-modal-header">
          <h3>Zahlung anfordern</h3>
          <button className="paypal-modal-close" onClick={onClose}>x</button>
        </div>
        <div className="paypal-modal-body">
          <p className="paypal-modal-info">
            <strong>{personName}</strong> schuldet <strong>{amount.toFixed(2)} EUR</strong>
          </p>
          <div className="paypal-modal-qr">
            <img src={qrUrl} alt="PayPal QR Code" width={180} height={180} />
          </div>
          <div className="paypal-modal-link">
            <input type="text" value={paypalLink} readOnly />
            <button className="btn btn-primary btn-sm" onClick={handleCopy}>
              {copied ? 'Kopiert!' : 'Kopieren'}
            </button>
          </div>
          <a
            className="btn btn-primary paypal-modal-open"
            href={paypalLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            In PayPal oeffnen
          </a>
        </div>
      </div>
    </div>
  )
}
