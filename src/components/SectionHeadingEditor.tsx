import { memo, useState, useRef, useEffect, type FormEvent } from 'react';
import type { SectionHeading } from '../state/sequencerReducer.js';

const PRESET_LABELS = [
  'Intro', 'Verse', 'Pre-Chorus', 'Chorus',
  'A', 'B', 'C', 'D',
  'Solos', 'Repeat',
];

interface AnchorRect {
  left: number;
  bottom: number;
}

interface SectionHeadingEditorProps {
  heading: SectionHeading | null;
  anchorRect: AnchorRect | null;
  onSave: (label: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

function SectionHeadingEditor({ heading, anchorRect, onSave, onDelete, onClose }: SectionHeadingEditorProps) {
  const [text, setText] = useState(heading?.label ?? '');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleSelect = (label: string) => {
    onSave(label);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (text.trim()) onSave(text.trim());
  };

  return (
    <div
      ref={panelRef}
      className="section-heading-editor absolute z-50 bg-card rounded-xl shadow-xl border border-border p-3 w-64"
      style={{
        left: anchorRect?.left ?? 0,
        top: (anchorRect?.bottom ?? 0) + 4,
      }}
    >
      <form onSubmit={handleSubmit} className="flex gap-1.5 mb-2.5">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Section name..."
          className="section-heading-input flex-1 px-2.5 py-1.5 rounded-lg bg-bg border border-border text-sm font-display font-medium text-text outline-none focus:border-sky transition-colors"
          maxLength={24}
        />
        <button
          type="submit"
          className="section-heading-save px-2.5 py-1.5 rounded-lg bg-sky text-white text-xs font-semibold cursor-pointer transition-colors hover:bg-sky/80"
          disabled={!text.trim()}
        >
          Save
        </button>
      </form>

      <div className="section-heading-presets flex flex-wrap gap-1">
        {PRESET_LABELS.map((label) => (
          <button
            key={label}
            className={`section-preset-btn px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors
              ${heading?.label === label
                ? 'bg-sky/15 text-sky font-semibold'
                : 'bg-gray-100 text-text hover:bg-gray-200'
              }`}
            onClick={() => handleSelect(label)}
          >
            {label}
          </button>
        ))}
      </div>

      {heading && (
        <button
          className="section-heading-delete mt-2.5 text-xs text-stop hover:underline cursor-pointer"
          onClick={onDelete}
        >
          Remove heading
        </button>
      )}
    </div>
  );
}

export default memo(SectionHeadingEditor);
