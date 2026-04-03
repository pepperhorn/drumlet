/**
 * Share codec — encodes/decodes sequencer state to/from a compact URL-safe string.
 *
 * Format: base64url-encoded JSON stored in the URL hash.
 *
 * Share URL:  https://drumlet.app/#s={encoded}
 * Embed URL:  https://drumlet.app/embed#s={encoded}
 *             or https://drumlet.app/?embed=1#s={encoded}
 *
 * The encoded payload is a minimal representation — only what's needed to
 * reconstruct the pattern. No UUIDs, no stashed steps, no mute/solo state.
 */

/**
 * Encode state into a compact JSON payload, then base64url.
 */
export function encodeState(state, pluginMeta = null) {
  const page = state.pages[state.currentPageIndex];
  if (!page) return null;

  // Encode steps: plain digits for normal, (v1,v2,...) for splits
  function encodeSteps(steps, count) {
    return steps.slice(0, count).map(s =>
      Array.isArray(s) ? `(${s.join(',')})` : String(s)
    ).join('');
  }

  const payload = {
    v: 3, // format version — v3 adds splits + swingTarget
    b: state.bpm,
    sw: state.swing || 0,
    st: state.swingTarget || '8th',
    hu: state.humanize || 0,
    sp: state.stepsPerPage,
    nv: state.noteValue || '1/4',
    bb: state.beatsPerBar || 4,
    sv: state.stepValue || '1/16',
    pm: pluginMeta || null,
    t: page.tracks.map((t) => {
      const tr = {
        n: t.name,
        s: encodeSteps(t.steps, state.stepsPerPage),
        vm: t.velMode || 3,
        vo: t.volume,
        rv: t.reverb,
      };
      // Source info
      if (t.sourceType === 'drumMachine') {
        tr.st = 'dm';
        tr.i = t.instrument;
        tr.g = t.group;
      } else if (t.sourceType === 'soundfont') {
        tr.st = 'sf';
        tr.sf = t.soundfontName;
      } else if (t.sourceType === 'kit') {
        tr.st = 'k';
        tr.ki = t.kitId;
        tr.ks = t.kitSample;
      }
      // Skip custom samples — can't share those via URL
      return tr;
    }),
  };

  const json = JSON.stringify(payload);
  // base64url encode
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode a base64url string back into a sequencer state.
 */
export function decodeState(encoded) {
  const payload = decodePayload(encoded);
  return payload?.state || null;
}

export function decodePayload(encoded) {
  try {
    // base64url decode
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = atob(b64);
    const p = JSON.parse(json);

    if (p.v !== 1 && p.v !== 2 && p.v !== 3) return null;

    // Decode steps string: plain digits or (v1,v2,...) groups
    function decodeSteps(str) {
      const matches = [...str.matchAll(/\([\d,]+\)|\d/g)];
      return matches.map(m => {
        if (m[0].startsWith('(')) {
          return m[0].slice(1, -1).split(',').map(Number);
        }
        return Number(m[0]);
      });
    }

    const tracks = p.t.map((tr, i) => {
      const COLORS = ['#FF6B6B', '#FFB347', '#A8E06C', '#5BC0EB', '#B39DDB', '#FFAB91', '#66D9A0', '#F48FB1'];
      const base = {
        id: crypto.randomUUID(),
        name: tr.n,
        color: COLORS[i % COLORS.length],
        volume: tr.vo ?? 80,
        reverb: tr.rv ?? 20,
        velMode: tr.vm || 3,
        _stashedSteps: {},
        mute: false,
        solo: false,
        steps: p.v >= 3 ? decodeSteps(tr.s) : tr.s.split('').map(Number),
        soundfontName: null,
        customSampleName: null,
        kitId: null,
        kitSample: null,
        instrument: null,
        group: null,
      };

      if (tr.st === 'dm') {
        base.sourceType = 'drumMachine';
        base.instrument = tr.i || 'TR-808';
        base.group = tr.g || 'kick';
      } else if (tr.st === 'sf') {
        base.sourceType = 'soundfont';
        base.soundfontName = tr.sf;
      } else if (tr.st === 'k') {
        base.sourceType = 'kit';
        base.kitId = tr.ki;
        base.kitSample = tr.ks;
      } else {
        base.sourceType = 'drumMachine';
        base.instrument = 'TR-808';
        base.group = 'kick';
      }

      return base;
    });

    return {
      state: {
        pages: [{
          id: crypto.randomUUID(),
          name: 'Page 1',
          tracks,
        }],
        currentPageIndex: 0,
        stepsPerPage: p.sp || 16,
        bpm: p.b || 120,
        noteValue: p.nv || '1/4',
        beatsPerBar: p.bb || 4,
        stepValue: p.sv || '1/16',
        swing: p.sw || 0,
        swingTarget: p.st || '8th',
        humanize: p.hu || 0,
        chainMode: false,
      },
      pluginMeta: p.pm || null,
    };
  } catch (e) {
    console.error('Failed to decode share URL:', e);
    return null;
  }
}

/**
 * Build a share URL for the current state.
 */
export function buildShareUrl(state, baseUrl = 'https://drumlet.app', pluginMeta = null) {
  const encoded = encodeState(state, pluginMeta);
  if (!encoded) return null;
  return `${baseUrl}/#s=${encoded}`;
}

/**
 * Build an embed URL. Adds embed=1 param and uses compact layout.
 */
export function buildEmbedUrl(state, baseUrl = 'https://drumlet.app', pluginMeta = null) {
  const encoded = encodeState(state, pluginMeta);
  if (!encoded) return null;
  return `${baseUrl}/?embed=1#s=${encoded}`;
}

/**
 * Build an iframe embed snippet.
 */
export function buildEmbedSnippet(state, baseUrl = 'https://drumlet.app', pluginMeta = null) {
  const url = buildEmbedUrl(state, baseUrl, pluginMeta);
  if (!url) return null;
  return `<iframe src="${url}" width="100%" height="400" frameborder="0" style="border-radius:16px;border:1px solid #E2E8F0;" allow="autoplay"></iframe>`;
}

/**
 * Check the current URL for a shared state and return it if found.
 */
export function loadFromUrl() {
  const payload = loadSharedPayload();
  return payload?.state || null;
}

export function loadSharedPayload() {
  const hash = window.location.hash;
  const match = hash.match(/[#&]s=([A-Za-z0-9_-]+)/);
  if (match) {
    return decodePayload(match[1]);
  }
  return null;
}

/**
 * Check if we're in embed mode.
 */
export function isEmbedMode() {
  return new URLSearchParams(window.location.search).has('embed');
}
