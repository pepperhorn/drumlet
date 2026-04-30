import { memo, useState } from 'react'
import { savePresetToLibrary } from './jameeBridge'

interface Props { preset: any; presetName: string }

function AddToJameeImpl({ preset, presetName }: Props) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ external_id: string; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (busy) return
    setBusy(true); setError(null)
    try {
      const ref = await savePresetToLibrary(preset, presetName || 'Untitled preset')
      setDone(ref)
    } catch (e: any) {
      setError(e?.message ?? 'failed to save')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="add-jamee-done text-xs flex items-center gap-2 px-3 py-1.5 rounded">
        <span>✓ Added to Jamee Library</span>
        <button className="text-xs underline" onClick={() => setDone(null)}>add again</button>
      </div>
    )
  }

  return (
    <div className="add-jamee-host inline-flex items-center gap-2">
      <button
        className="add-jamee-btn px-3 py-1.5 text-sm rounded"
        onClick={handleAdd}
        disabled={busy}
      >
        {busy ? 'saving…' : 'Add to Jamee'}
      </button>
      {error && <span className="add-jamee-error text-xs" style={{ color: '#EF4444' }}>{error}</span>}
    </div>
  )
}

export const AddToJamee = memo(AddToJameeImpl)
