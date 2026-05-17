/**
 * JSON Schema (draft-07) for the `.drumlet` project file format.
 *
 * A `.drumlet` file is a dottl-spec **v5** document with a `drumlet`
 * extension block. The dottl-spec fields (`layers`, `sections`, …) are the
 * portable, cross-tool representation; `extensions.drumlet` carries the
 * loss-free Drumlet state (raw step grid, per-page tracks, sources).
 *
 * Importers should prefer `extensions.drumlet` when present and fall back to
 * the generic dottl-spec layers otherwise. See docs/drumlet-spec.md and the
 * canonical serializer in `projectSerializer.ts`.
 *
 * Exposed for tools that want to validate `.drumlet` files.
 */
export const DRUMLET_JSON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://drumlet.app/schemas/drumlet.json',
  title: 'DrumletProject',
  description: 'A dottl-spec v5 project document with a Drumlet extension block.',
  type: 'object',
  required: [
    'version', 'projectName', 'bpm', 'divisor', 'timeSignature',
    'layers', 'sections', 'extensions',
  ],
  properties: {
    version: { type: 'integer', const: 5, description: 'dottl-spec version. Drumlet writes 5.' },
    projectName: { type: 'string' },
    bpm: { type: 'number', exclusiveMinimum: 0 },
    divisor: { type: 'integer', description: 'Beat subdivision hint (Drumlet writes 4).' },
    timeSignature: {
      type: 'object',
      required: ['numerator', 'denominator'],
      properties: {
        numerator: { type: 'integer', minimum: 1 },
        denominator: { $ref: '#/$defs/noteValueKey' },
      },
    },
    transposition: { type: 'integer', description: 'Semitone transposition. 0 for drums.' },
    difficulty: { type: 'null' },
    layers: { type: 'array', items: { $ref: '#/$defs/layer' } },
    markers: { type: 'array', description: 'Reserved. Drumlet writes [].' },
    sections: { type: 'array', items: { $ref: '#/$defs/section' } },
    chords: { type: 'array', description: 'Reserved. Drumlet writes [].' },
    extensions: {
      type: 'object',
      required: ['drumlet'],
      properties: { drumlet: { $ref: '#/$defs/drumletExt' } },
    },
  },

  $defs: {
    noteValueKey: {
      type: 'string',
      enum: ['1/32', '1/16', '1/8', '1/4', 'd1/4', '1/2'],
      description: 'Note value key. "d1/4" is a dotted quarter.',
    },

    note: {
      type: 'object',
      description: 'A sounded grid cell, projected to a global column.',
      required: ['id', 'name', 'col', 'row', 'octave', 'isRoot', 'isStartNote', 'sustainCells', 'velocity'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string', description: 'Pitch name. Drums use "C".' },
        col: { type: 'integer', minimum: 1, description: '1-based global column (page-offset applied).' },
        subCol: { type: 'integer', minimum: 0, description: 'Sub-step index within a split cell.' },
        subCount: { type: 'integer', minimum: 2, description: 'Number of sub-steps in the split cell.' },
        row: { type: 'integer' },
        octave: { type: 'integer' },
        isRoot: { type: 'boolean' },
        isStartNote: { type: 'boolean' },
        sustainCells: { type: 'integer', minimum: 0 },
        velocity: { type: 'number', description: 'Velocity (Drumlet velocity model: 1 / 2 / 3 …).' },
      },
    },

    layer: {
      type: 'object',
      description: 'One instrument voice. Maps 1:1 to a Drumlet track id.',
      required: ['id', 'name', 'color', 'smplrLibrary', 'smplrPatch', 'volume', 'reverb', 'notes'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        color: { type: 'string' },
        instrumentCategory: { type: 'string', description: 'Drumlet writes "Drums".' },
        smplrLibrary: { type: 'string', enum: ['DrumMachine', 'Soundfont', 'Sampler'] },
        smplrPatch: { type: 'string', description: 'Instrument / soundfont / sample name.' },
        volume: { type: 'number' },
        reverb: { type: 'number' },
        notes: { type: 'array', items: { $ref: '#/$defs/note' } },
        lines: { type: 'array', description: 'Reserved. Drumlet writes [].' },
      },
    },

    section: {
      type: 'object',
      description: 'A page boundary, anchored to a global column.',
      required: ['id', 'col', 'name'],
      properties: {
        id: { type: 'string' },
        col: { type: 'integer', minimum: 1 },
        name: { type: 'string' },
      },
    },

    step: {
      description:
        'A single grid cell. number = primitive velocity (0 = off). ' +
        'number[] = legacy split bank. object = MultiStep split cell.',
      anyOf: [
        { type: 'number' },
        { type: 'array', items: { type: 'number' } },
        { $ref: '#/$defs/multiStep' },
      ],
    },

    multiStep: {
      type: 'object',
      description: 'A split cell with per-division velocity banks.',
      required: ['v', 'active', 's'],
      properties: {
        v: { type: 'number', description: 'Primitive velocity when not split.' },
        active: { type: 'integer', enum: [2, 3, 4], description: 'Active split count.' },
        s: {
          type: 'object',
          description: 'Velocity banks keyed by split count ("2" | "3" | "4").',
          propertyNames: { enum: ['2', '3', '4'] },
          additionalProperties: { type: 'array', items: { type: 'number' } },
        },
      },
    },

    trackSource: {
      type: 'object',
      description: 'Sound source binding for a track (page-independent).',
      required: ['id', 'sourceType', 'color', 'mute', 'solo'],
      properties: {
        id: { type: 'string' },
        sourceType: { type: 'string', enum: ['drumMachine', 'soundfont', 'kit', 'custom'] },
        instrument: { type: ['string', 'null'] },
        group: { type: ['string', 'null'] },
        soundfontName: { type: ['string', 'null'] },
        customSampleName: { type: ['string', 'null'] },
        color: { type: 'string' },
        mute: { type: 'boolean' },
        solo: { type: 'boolean' },
      },
    },

    drumletExt: {
      type: 'object',
      description: 'Loss-free Drumlet state. Authoritative on import when present.',
      required: [
        'stepsPerPage', 'stepValue', 'beatsPerBar', 'noteValue',
        'swingTarget', 'chainMode', 'rawPageSteps', 'pages', 'trackSources',
      ],
      properties: {
        stepsPerPage: { type: 'integer', minimum: 1 },
        stepValue: { $ref: '#/$defs/noteValueKey' },
        beatsPerBar: { type: 'integer', minimum: 1 },
        noteValue: { $ref: '#/$defs/noteValueKey' },
        swingTarget: { type: 'string', enum: ['8th', '16th'] },
        chainMode: { type: 'boolean' },
        rawPageSteps: {
          type: 'object',
          description: 'pageId -> (trackId -> Step[]). The authoritative grid.',
          additionalProperties: {
            type: 'object',
            additionalProperties: { type: 'array', items: { $ref: '#/$defs/step' } },
          },
        },
        pages: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'name'],
            properties: { id: { type: 'string' }, name: { type: 'string' } },
          },
        },
        trackSources: { type: 'array', items: { $ref: '#/$defs/trackSource' } },
      },
    },
  },
} as const;
