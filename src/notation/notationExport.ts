/**
 * SVG and PNG download utilities for notation.
 *
 * Some notation glyphs can be emitted as font-backed <text> elements. When the
 * SVG is opened standalone or rasterized via <img>, those glyphs can vanish if
 * the font is not available. Fix: collect matching @font-face rules and embed
 * them inline so exported SVGs are self-contained where the renderer uses text.
 */

const MUSIC_FONT_FAMILIES = ['Petaluma', 'Petaluma Script', 'Bravura'];

function collectFontFaceCSS(): string {
  const wanted = new Set(MUSIC_FONT_FAMILIES.map((f) => f.toLowerCase()));
  const collected: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    if (!rules) continue;
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const family = rule.style.getPropertyValue('font-family').replace(/['"]/g, '').trim().toLowerCase();
      if (wanted.has(family)) collected.push(rule.cssText);
    }
  }
  return collected.join('\n');
}

function ensureFontStyle(svg: SVGElement): void {
  if (svg.querySelector('style[data-drumlet-fonts]')) return;
  const fontCSS = collectFontFaceCSS();
  if (!fontCSS) return;
  const ns = svg.namespaceURI ?? 'http://www.w3.org/2000/svg';
  const defs = svg.querySelector('defs') ?? svg.insertBefore(
    document.createElementNS(ns, 'defs'),
    svg.firstChild,
  );
  const style = document.createElementNS(ns, 'style');
  style.setAttribute('data-drumlet-fonts', 'true');
  style.textContent = fontCSS;
  defs.appendChild(style);
}

function serializeWithFonts(svgElement: SVGElement): string {
  const clone = svgElement.cloneNode(true) as SVGElement;
  ensureFontStyle(clone);
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  return new XMLSerializer().serializeToString(clone);
}

export function downloadSVG(svgElement: SVGElement, filename?: string): void {
  const svgString = serializeWithFonts(svgElement);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? 'drumlet-notation.svg';
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadPNG(svgElement: SVGElement, filename?: string, scale = 2): void {
  const svgString = serializeWithFonts(svgElement);
  const img = new Image();
  // Use a data URL (not blob URL): some browsers treat blob URLs as a separate
  // origin and silently drop inline @font-face resolution.
  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
  img.onload = () => {
    const width = img.width || svgElement.clientWidth || 800;
    const height = img.height || svgElement.clientHeight || 200;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = filename ?? 'drumlet-notation.png';
      a.click();
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
  };
  img.src = dataUrl;
}
