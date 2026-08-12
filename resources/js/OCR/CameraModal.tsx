/**
 * ============================================================
 * OCR/CameraModal.tsx
 * ============================================================
 * Custom modal displayed BEFORE requesting browser camera permission.
 *
 * PURPOSE:
 *   Provide a polished, Rollyn-branded explanation screen so the
 *   administrator understands WHY camera access is needed BEFORE the
 *   browser's native permission dialog appears.
 *
 *   IMPORTANT: This modal does NOT replace the browser permission system.
 *   When the administrator clicks "Allow Camera Access", this component
 *   calls navigator.mediaDevices.getUserMedia() which triggers the real
 *   browser permission prompt. This is simply an UX/explanation layer.
 *
 * PORTABILITY:
 *   This file has ZERO dependency on IncomingRoll business logic.
 * ============================================================
 */

import React from 'react';
import { Camera, X } from 'lucide-react';

interface CameraModalProps {
  /** Called when the administrator confirms — triggers browser permission request */
  onAllow: () => void;
  /** Called when the administrator dismisses the modal */
  onCancel: () => void;
}

export default function CameraModal({ onAllow, onCancel }: CameraModalProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
        onClick={onCancel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-modal-title"
      >
        {/* Modal card */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '32px 28px',
            maxWidth: 400,
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            position: 'relative',
            textAlign: 'center',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onCancel}
            aria-label="Cancel camera access"
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#999',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>

          {/* Camera icon — branded */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #286090 0%, #337ab7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 4px 16px rgba(40, 96, 144, 0.35)',
            }}
          >
            <Camera size={32} color="#fff" />
          </div>

          {/* Title */}
          <h2
            id="camera-modal-title"
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#1a2332',
              margin: '0 0 10px',
            }}
          >
            Camera Access Required
          </h2>

          {/* Description */}
          <p
            style={{
              fontSize: 14,
              color: '#555',
              lineHeight: 1.6,
              margin: '0 0 8px',
            }}
          >
            Rollyn needs camera access to read the weighing scale display automatically.
          </p>
          <p
            style={{
              fontSize: 13,
              color: '#888',
              lineHeight: 1.5,
              margin: '0 0 28px',
            }}
          >
            After clicking{' '}
            <strong style={{ color: '#286090' }}>Allow Camera Access</strong>, your browser
            will ask for permission. No images are sent to any external server — all
            processing happens entirely within this browser.
          </p>

          {/* Divider */}
          <div style={{ height: 1, background: '#eee', marginBottom: 20 }} />

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              id="camera-modal-allow-btn"
              onClick={onAllow}
              style={{
                background: 'linear-gradient(135deg, #286090 0%, #337ab7 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <Camera size={16} />
              Allow Camera Access
            </button>

            <button
              id="camera-modal-cancel-btn"
              onClick={onCancel}
              style={{
                background: 'none',
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: '10px 20px',
                fontSize: 13,
                color: '#666',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
