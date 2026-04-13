// Shallow declarations for third-party libs without bundled types
// reachable through their package.json exports field. Each boundary
// surface is typed at the call site.

declare module 'midi-writer-js' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m: any;
  export default m;
}

declare module 'smplr' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const DrumMachine: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Soundfont: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Sampler: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Reverb: any;
  export default m;
}

declare module 'vexflow' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Renderer: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Stave: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const StaveNote: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Voice: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Formatter: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Beam: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Stem: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const GhostNote: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Dot: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Annotation: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Tickable: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const VoiceMode: any;
  export default m;
}
