const BEAT_LABELS: Record<string, (b: number) => string[]> = {
  '1/4':  (b) => [`${b}`],
  '1/8':  (b) => [`${b}`, '&'],
  '1/8T': (b) => [`${b}`, '&', 'a'],
  '1/16': (b) => [`${b}`, 'e', '&', 'a'],
  '1/16T': (b) => [`${b}`, 'ta', 'ta', '&', 'ta', 'ta'],
};

export function beatCountLabels(subdivision: string, beatIndex: number, beatsPerBar: number): string[] {
  return BEAT_LABELS[subdivision]?.((beatIndex % beatsPerBar) + 1) ?? [];
}
