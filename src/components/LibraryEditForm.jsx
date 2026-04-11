import { useState } from 'react';

/**
 * Inline form for saving / editing a user library entry.
 * Replaces Library content when editMode is set.
 */
export default function LibraryEditForm({ editMode, entry, activePreset, state, onSave, onCancel, onDelete }) {
  const isNew = editMode.isNew;

  const [name, setName] = useState('');
  const [inTheStyleOf, setInTheStyleOf] = useState(false);
  const [credit, setCredit] = useState('');
  const [creditUrl, setCreditUrl] = useState('');
  const [cover, setCover] = useState('');
  const [body, setBody] = useState('');
  const [notes, setNotes] = useState('');
  const [wikipedia, setWikipedia] = useState('');
  const [spotify, setSpotify] = useState('');
  const [youtube, setYoutube] = useState(entry?.links?.youtube || activePreset?.links?.youtube || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      name: name.trim() || 'Untitled',
      inTheStyleOf,
      credit: credit.trim(),
      creditUrl: creditUrl.trim(),
      cover: cover.trim(),
      body: body.trim(),
      notes: notes.trim(),
      links: {
        wikipedia: wikipedia.trim(),
        spotify: spotify.trim(),
        youtube: youtube.trim(),
      },
      sourcePreset: entry?.sourcePreset || activePreset?.name || null,
    });
  };

  return (
    <form className="library-edit-form max-w-lg mx-auto" onSubmit={handleSubmit}>
      <h3 className="edit-form-title text-lg font-display font-bold text-text mb-5">
        {isNew ? 'Save to Your Library' : 'Edit Pattern'}
      </h3>

      {/* Auto-populated info */}
      <div className="edit-form-auto-info flex gap-3 text-xs text-muted mb-5 px-1">
        <span className="edit-form-bpm font-mono">{state?.bpm || '—'} BPM</span>
        {(state?.swing > 0) && <span className="edit-form-swing font-mono">Swing {state.swing}</span>}
      </div>

      {/* Name */}
      <div className="edit-field mb-4">
        <label className="edit-label block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5" htmlFor="edit-name">
          Name
        </label>
        <input
          id="edit-name"
          type="text"
          className="edit-input w-full h-10 px-3 rounded-xl bg-bg border border-border text-sm text-text outline-none focus:border-sky transition-colors"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Pattern"
          autoFocus
        />
      </div>

      {/* In the style of toggle */}
      <div className="edit-field mb-4 flex items-center gap-3">
        <button
          type="button"
          className={`edit-toggle w-10 h-6 rounded-full transition-colors cursor-pointer ${inTheStyleOf ? 'bg-sky' : 'bg-border'}`}
          onClick={() => setInTheStyleOf(!inTheStyleOf)}
          role="switch"
          aria-checked={inTheStyleOf}
        >
          <span className={`edit-toggle-thumb block w-4 h-4 rounded-full bg-white shadow-sm transition-transform mx-1 ${inTheStyleOf ? 'translate-x-4' : ''}`} />
        </button>
        <label className="edit-toggle-label text-sm text-text cursor-pointer" onClick={() => setInTheStyleOf(!inTheStyleOf)}>
          "In the style of" label
        </label>
      </div>

      {/* Credit */}
      <div className="edit-field mb-4">
        <label className="edit-label block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5" htmlFor="edit-credit">
          Credit
        </label>
        <input
          id="edit-credit"
          type="text"
          className="edit-input w-full h-10 px-3 rounded-xl bg-bg border border-border text-sm text-text outline-none focus:border-sky transition-colors"
          value={credit}
          onChange={(e) => setCredit(e.target.value)}
          placeholder="Artist name, year"
        />
      </div>

      {/* Credit URL */}
      <div className="edit-field mb-4">
        <label className="edit-label block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5" htmlFor="edit-credit-url">
          Credit URL
        </label>
        <input
          id="edit-credit-url"
          type="url"
          className="edit-input w-full h-10 px-3 rounded-xl bg-bg border border-border text-sm text-text outline-none focus:border-sky transition-colors"
          value={creditUrl}
          onChange={(e) => setCreditUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      {/* Cover Image URL */}
      <div className="edit-field mb-4">
        <label className="edit-label block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5" htmlFor="edit-cover">
          Cover Image URL
        </label>
        <input
          id="edit-cover"
          type="url"
          className="edit-input w-full h-10 px-3 rounded-xl bg-bg border border-border text-sm text-text outline-none focus:border-sky transition-colors"
          value={cover}
          onChange={(e) => setCover(e.target.value)}
          placeholder="https://..."
        />
      </div>

      {/* Description */}
      <div className="edit-field mb-4">
        <label className="edit-label block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5" htmlFor="edit-body">
          Description
        </label>
        <textarea
          id="edit-body"
          className="edit-textarea w-full h-20 px-3 py-2 rounded-xl bg-bg border border-border text-sm text-text outline-none focus:border-sky transition-colors resize-none"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="About this pattern..."
        />
      </div>

      {/* Notes */}
      <div className="edit-field mb-4">
        <label className="edit-label block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5" htmlFor="edit-notes">
          Performance Notes
        </label>
        <textarea
          id="edit-notes"
          className="edit-textarea w-full h-20 px-3 py-2 rounded-xl bg-bg border border-border text-sm text-text outline-none focus:border-sky transition-colors resize-none"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Tips for playing this pattern..."
        />
      </div>

      {/* Links */}
      <div className="edit-links-section mb-6">
        <span className="edit-label block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
          Reference Links
        </span>
        <div className="edit-links-grid flex flex-col gap-2">
          <div className="edit-link-row flex items-center gap-2">
            <span className="edit-link-icon w-5 text-center text-muted text-xs">W</span>
            <input
              type="url"
              className="edit-input flex-1 h-9 px-3 rounded-lg bg-bg border border-border text-sm text-text outline-none focus:border-sky transition-colors"
              value={wikipedia}
              onChange={(e) => setWikipedia(e.target.value)}
              placeholder="Wikipedia URL"
            />
          </div>
          <div className="edit-link-row flex items-center gap-2">
            <span className="edit-link-icon w-5 text-center text-xs" style={{ color: '#1DB954' }}>S</span>
            <input
              type="url"
              className="edit-input flex-1 h-9 px-3 rounded-lg bg-bg border border-border text-sm text-text outline-none focus:border-sky transition-colors"
              value={spotify}
              onChange={(e) => setSpotify(e.target.value)}
              placeholder="Spotify URL"
            />
          </div>
          <div className="edit-link-row flex items-center gap-2">
            <span className="edit-link-icon w-5 text-center text-xs" style={{ color: '#FF0000' }}>Y</span>
            <input
              type="url"
              className="edit-input flex-1 h-9 px-3 rounded-lg bg-bg border border-border text-sm text-text outline-none focus:border-sky transition-colors"
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
              placeholder="YouTube URL"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="edit-form-actions flex items-center gap-3">
        <button
          type="submit"
          className="edit-save-btn px-5 h-10 rounded-xl bg-sky text-white font-semibold text-sm cursor-pointer hover:bg-sky/90 transition-colors"
        >
          {isNew ? 'Save' : 'Update'}
        </button>
        <button
          type="button"
          className="edit-cancel-btn px-5 h-10 rounded-xl bg-gray-100 text-muted font-semibold text-sm cursor-pointer hover:bg-gray-200 transition-colors"
          onClick={onCancel}
        >
          Cancel
        </button>
        {onDelete && !isNew && (
          <button
            type="button"
            className="edit-delete-btn ml-auto px-4 h-10 rounded-xl text-red-400 font-semibold text-sm cursor-pointer hover:bg-red-50 transition-colors"
            onClick={onDelete}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
