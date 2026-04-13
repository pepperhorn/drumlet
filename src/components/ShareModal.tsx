import { memo, useState, useCallback } from 'react';
import { buildShareUrl, buildEmbedUrl, buildEmbedSnippet } from '../state/shareCodec.js';
import type { SequencerState } from '../state/sequencerReducer.js';

type CopiedKey = 'share' | 'embed' | 'iframe' | null;

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: SequencerState;
}

function ShareModal({ isOpen, onClose, state }: ShareModalProps) {
  const [copied, setCopied] = useState<CopiedKey>(null);

  const shareUrl = isOpen ? (buildShareUrl(state) ?? '') : '';
  const embedUrl = isOpen ? (buildEmbedUrl(state) ?? '') : '';
  const iframeSnippet = isOpen ? (buildEmbedSnippet(state) ?? '') : '';

  const handleCopy = useCallback(async (text: string, type: CopiedKey) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <>
      <div className="share-backdrop fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="share-modal fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card rounded-2xl shadow-2xl border border-border w-[480px] max-w-[90vw] p-6">
        <div className="share-header flex items-center justify-between mb-5">
          <h3 className="share-title text-lg lg:text-xl font-display font-bold text-text">Share</h3>
          <button
            className="share-close-btn w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-muted hover:text-text cursor-pointer transition-colors"
            onClick={onClose}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
            </svg>
          </button>
        </div>

        <div className="share-section mb-4">
          <label className="share-label text-[10px] lg:text-xs text-muted font-semibold uppercase tracking-wide block mb-1.5">
            Share Link
          </label>
          <div className="share-input-row flex gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="share-url-input flex-1 px-3 py-2 rounded-xl bg-bg border border-border text-xs lg:text-sm font-mono text-text truncate outline-none focus:border-sky"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              className={`share-copy-btn px-3 py-2 rounded-xl text-xs lg:text-sm font-semibold cursor-pointer transition-all shrink-0
                ${copied === 'share' ? 'bg-play text-white' : 'bg-sky/10 text-sky hover:bg-sky/20'}`}
              onClick={() => handleCopy(shareUrl, 'share')}
            >
              {copied === 'share' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="share-hint text-[10px] lg:text-xs text-muted mt-1">
            Anyone with this link can open your pattern in drumlet
          </p>
        </div>

        <div className="share-section mb-4">
          <label className="share-label text-[10px] lg:text-xs text-muted font-semibold uppercase tracking-wide block mb-1.5">
            Embed URL
          </label>
          <div className="share-input-row flex gap-2">
            <input
              type="text"
              readOnly
              value={embedUrl}
              className="share-embed-input flex-1 px-3 py-2 rounded-xl bg-bg border border-border text-xs lg:text-sm font-mono text-text truncate outline-none focus:border-sky"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <button
              className={`share-copy-btn px-3 py-2 rounded-xl text-xs lg:text-sm font-semibold cursor-pointer transition-all shrink-0
                ${copied === 'embed' ? 'bg-play text-white' : 'bg-sky/10 text-sky hover:bg-sky/20'}`}
              onClick={() => handleCopy(embedUrl, 'embed')}
            >
              {copied === 'embed' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="share-hint text-[10px] lg:text-xs text-muted mt-1">
            Compact player — no header, no library. For blogs, docs, or LMS
          </p>
        </div>

        <div className="share-section mb-2">
          <label className="share-label text-[10px] lg:text-xs text-muted font-semibold uppercase tracking-wide block mb-1.5">
            Embed HTML
          </label>
          <div className="share-input-row flex gap-2">
            <textarea
              readOnly
              value={iframeSnippet}
              rows={3}
              className="share-iframe-input flex-1 px-3 py-2 rounded-xl bg-bg border border-border text-[10px] lg:text-xs font-mono text-text resize-none outline-none focus:border-sky"
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
            <button
              className={`share-copy-btn px-3 py-2 rounded-xl text-xs lg:text-sm font-semibold cursor-pointer transition-all shrink-0 self-start
                ${copied === 'iframe' ? 'bg-play text-white' : 'bg-sky/10 text-sky hover:bg-sky/20'}`}
              onClick={() => handleCopy(iframeSnippet, 'iframe')}
            >
              {copied === 'iframe' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="share-hint text-[10px] lg:text-xs text-muted mt-1">
            Drop this into any HTML page for an interactive drum pattern player
          </p>
        </div>
      </div>
    </>
  );
}

export default memo(ShareModal);
