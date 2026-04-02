/**
 * SVG and PNG download utilities for VexFlow notation.
 * Follows the same download pattern as projectSerializer.js and midiExport.js.
 */

export function downloadSVG(svgElement, filename) {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'drumlet-notation.svg';
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadPNG(svgElement, filename, scale = 2) {
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = filename || 'drumlet-notation.png';
      a.click();
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
    URL.revokeObjectURL(url);
  };
  img.src = url;
}
