import { useState, useCallback } from 'react'
import { useStore } from '../store'
import { encodeViewState, pushViewState } from '../utils/urlState'

/**
 * Snapshot journal for saving and sharing views.
 *
 * Features:
 * - Capture current view (camera + selected object)
 * - Save to localStorage with notes
 * - Generate shareable URL
 * - Screenshot capture via canvas
 */

const STORAGE_KEY = 'universe-explorer-snapshots'

function loadSnapshots() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveSnapshots(snapshots) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots))
}

export default function SnapshotJournal() {
  const selectedObject = useStore((s) => s.selectedObject)
  const speedLevel = useStore((s) => s.speedLevel)
  const setCameraTarget = useStore((s) => s.setCameraTarget)
  const setSpeedLevel = useStore((s) => s.setSpeedLevel)

  const [expanded, setExpanded] = useState(false)
  const [snapshots, setSnapshots] = useState(() => loadSnapshots())
  const [copied, setCopied] = useState(false)

  const captureSnapshot = useCallback(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas || !canvas.__r3f) return

    const camera = canvas.__r3f.store.getState().camera
    const objName = selectedObject?.common_name || selectedObject?.name || null

    const snapshot = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      position: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      },
      objectName: objName,
      objectId: selectedObject?.id || null,
      speedLevel,
      note: '',
    }

    const updated = [snapshot, ...snapshots].slice(0, 50) // Keep latest 50
    setSnapshots(updated)
    saveSnapshots(updated)
  }, [selectedObject, speedLevel, snapshots])

  const shareURL = useCallback(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas || !canvas.__r3f) return

    const camera = canvas.__r3f.store.getState().camera
    const encoded = encodeViewState(camera, selectedObject?.id, speedLevel)
    pushViewState(encoded)

    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [selectedObject, speedLevel])

  const loadSnapshot = useCallback((snapshot) => {
    setCameraTarget({
      x: snapshot.position.x,
      y: snapshot.position.y,
      z: snapshot.position.z,
      name: snapshot.objectName || 'Saved location',
    })
    setSpeedLevel(snapshot.speedLevel || 0)
  }, [setCameraTarget, setSpeedLevel])

  const deleteSnapshot = useCallback((id) => {
    const updated = snapshots.filter(s => s.id !== id)
    setSnapshots(updated)
    saveSnapshots(updated)
  }, [snapshots])

  const exportScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `universe-explorer-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }, [])

  return (
    <div className="absolute top-4 right-[340px] pointer-events-auto z-20">
      <div className="flex gap-1">
        <button
          onClick={captureSnapshot}
          className="bg-black/60 backdrop-blur-md border border-white/10 rounded px-2 py-1 text-xs text-white/50 hover:text-white/80 transition-colors"
          title="Save current view"
        >
          Save
        </button>
        <button
          onClick={shareURL}
          className="bg-black/60 backdrop-blur-md border border-white/10 rounded px-2 py-1 text-xs text-white/50 hover:text-white/80 transition-colors"
          title="Copy shareable URL"
        >
          {copied ? 'Copied!' : 'Share'}
        </button>
        <button
          onClick={exportScreenshot}
          className="bg-black/60 backdrop-blur-md border border-white/10 rounded px-2 py-1 text-xs text-white/50 hover:text-white/80 transition-colors"
          title="Download screenshot"
        >
          Photo
        </button>
        {snapshots.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="bg-black/60 backdrop-blur-md border border-white/10 rounded px-2 py-1 text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            Journal ({snapshots.length})
          </button>
        )}
      </div>

      {/* Snapshot list */}
      {expanded && snapshots.length > 0 && (
        <div className="mt-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-2 max-h-60 overflow-y-auto w-56">
          {snapshots.map((snap) => (
            <div
              key={snap.id}
              className="flex items-center justify-between py-1 border-b border-white/5 last:border-0"
            >
              <button
                onClick={() => loadSnapshot(snap)}
                className="text-left flex-1"
              >
                <div className="text-[11px] text-white/60 hover:text-white/90 transition-colors">
                  {snap.objectName || 'Deep space'}
                </div>
                <div className="text-[9px] text-white/30">
                  {new Date(snap.timestamp).toLocaleDateString()}
                </div>
              </button>
              <button
                onClick={() => deleteSnapshot(snap.id)}
                className="text-[10px] text-white/20 hover:text-red-400/60 ml-2"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
