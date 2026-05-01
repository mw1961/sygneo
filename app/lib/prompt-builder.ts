/**
 * Prompt builder — abstract geometric metaphors per origin + occupation.
 * Strategy: translate inputs into geometric symbols, never literal objects.
 */

// ── Origin → geometric art metaphor ──────────────────────────────────────────

const ORIGIN_METAPHOR: Record<string, string> = {
  israel:          'interlocking eight-pointed star grid geometry, arabesque lattice symmetry',
  morocco:         'zellige twelve-pointed star tessellation, interlocking polygon grid',
  tunisia:         'hexagonal mosaic grid with alternating diamond geometry',
  egypt:           'nested concentric square spiral, stepped diagonal geometry',
  iraq:            'ancient stepped-grid geometry, interlocking angular zigzag',
  iran:            'sixteen-point star arabesque grid, radial polygon symmetry',
  turkey:          'anatolian geometric lattice with interlocking hexagonal tiles',
  jordan:          'angular crossing diagonal grid with bold border frame',
  lebanon:         'concentric polygon spiral with bold chevron border',
  yemen:           'bold angular star polygon with inner concentric grid',
  saudi:           'diamond lattice with alternating negative space grid',
  poland:          'folk-art inspired symmetry, Wycinanki-style cut-paper geometric star',
  russia:          'bold interlocking circle and square folk-pattern geometry',
  ukraine:         'Pysanka-inspired diamond grid with angular concentric rings',
  romania:         'angular folk-diamond border with inner star grid',
  hungary:         'bold angular cross with concentric ring folk geometry',
  france:          'Gothic tracery geometry, pointed arch grid pattern',
  spain:           'Mudéjar eight-pointed star with interlocking square grid',
  portugal:        'Azulejo alternating grid with interlocking square tiles',
  italy:           'Renaissance circular rosette with radiating triangular segments',
  germany:         'bold angular cross-hatch geometric grid with square frame',
  netherlands:     'diagonal offset grid with bold diamond repeat pattern',
  sweden:          'Norse interlace knotwork, angular braid geometry',
  norway:          'Viking angular knotwork with bold border frame',
  denmark:         'circular interlace ring with bold crossing line geometry',
  finland:         'angular Nordic star with concentric ring symmetry',
  greece:          'Greek meander key-fret border with concentric ring center',
  'united kingdom':'Celtic triple spiral interlace, angular knotwork geometry',
  ireland:         'Celtic triskelion triple spiral with bold stroke geometry',
  japan:           'Japanese Mon style: single bold centered geometric motif, extreme negative space, radial circular symmetry',
  china:           'square key-fret spiral border, interlocking angular grid',
  india:           'geometric jali lattice with interlocking octagonal stars',
  'south korea':   'bold concentric curve geometry, angular divided circle',
  'united states': 'art deco radiating starburst geometry, concentric ring layers',
  canada:          'bold hexagonal snowflake geometry with angular radial arms',
  mexico:          'stepped Aztec pyramid geometry with concentric angular rings',
  brazil:          'bold geometric starburst with angular concentric border',
  argentina:       'radial sun-ray geometry, concentric bold rings without face',
  'south africa':  'angular Zulu geometric beadwork, bold diamond grid pattern',
  default:         'bold concentric rings with radial spoke symmetry geometry',
};

function getOriginMetaphor(origins: string[]): string {
  for (const origin of origins) {
    const key = origin.toLowerCase().trim();
    for (const [country, metaphor] of Object.entries(ORIGIN_METAPHOR)) {
      if (key.includes(country)) return metaphor;
    }
  }
  return ORIGIN_METAPHOR.default;
}

// ── Occupation → geometric metaphor ──────────────────────────────────────────

const OCCUPATION_METAPHOR: Record<string, string> = {
  farmer:       'harvest cycle geometry: radial spoke wheel with twelve equal arc segments',
  shepherd:     'pastoral cycle geometry: concentric oval rings with uniform dot rhythm',
  fisherman:    'rhythmic water geometry: diamond wave grid with curved crossing arcs',
  sailor:       'navigation geometry: eight-point radial star with concentric ring border',
  merchant:     'exchange geometry: two symmetric triangles balanced on horizontal axis',
  banker:       'value geometry: nested squares rotated 45 degrees, bold diagonal grid',
  craftsman:    'craft geometry: interlocking gear-tooth ring with inner hexagon',
  blacksmith:   'forge geometry: bold diamond polygon with angular cross arms',
  carpenter:    'joinery geometry: mitered corner frame with diagonal inlay grid',
  weaver:       'loom geometry: over-under diagonal lattice grid, interlaced pattern',
  potter:       'wheel geometry: concentric circles with radial dividing spokes',
  jeweler:      'facet geometry: octagonal star with inner radiating triangles',
  baker:        'cycle geometry: bold pinwheel of eight equal triangular segments',
  miner:        'excavation geometry: bold X-chevron with concentric square border',
  physician:    'precision geometry: bold plus-cross with concentric ring border',
  scholar:      'grid-based geometric patterns, mathematical proportion grid, angular chevron pair',
  soldier:      'shield geometry: bold pentagonal form with inner chevron pattern',
  judge:        'balance geometry: symmetric bisected circle with two equal arms',
  artist:       'proportion geometry: bold Fibonacci spiral with concentric arcs',
  musician:     'rhythmic wave geometry, concentric frequency arcs with equal spacing',
  architect:    'structure geometry: bold arch with proportional grid framework',
  engineer:     'mechanism geometry: bold twelve-tooth cog ring with inner hexagon',
  writer:       'flow geometry: angular diagonal spiral with bold strokes',
  diplomat:     'union geometry: two interlocked rings, perfectly symmetric balance',
  hunter:       'trajectory geometry: bold angular chevron with concentric ring border',
  gardener:     'growth geometry: hexagonal grid with bold center diamond',
  inventor:     'discovery geometry: radial burst of lines with inner hexagon ring',
  priest:       'radiant geometry: concentric sunburst rings, strictly no cross or crescent',
  default:      'bold interlocking concentric ring geometry with radial symmetry',
};

function getOccupationMetaphor(occupations: string[]): string {
  for (const occ of occupations) {
    const key = occ.toLowerCase();
    for (const [k, metaphor] of Object.entries(OCCUPATION_METAPHOR)) {
      if (key.includes(k)) return metaphor;
    }
  }
  return OCCUPATION_METAPHOR.default;
}

// ── Style language ────────────────────────────────────────────────────────────

const STYLE_LANGUAGE: Record<string, string> = {
  japanese: 'Japanese Mon style: single centered motif, extreme negative space, radial symmetry',
  modern:   'Swiss International Style: mathematical grid, precise angles, clean minimal geometry',
  ancient:  'ancient craftwork: interlaced angular knotwork, layered geometric depth',
  abstract: 'pure abstract geometry: non-representational, balanced proportions, bold contrast',
};

function getStyleLanguage(style: string): string {
  const key = style.toLowerCase();
  if (key.includes('japanese')) return STYLE_LANGUAGE.japanese;
  if (key.includes('modern'))   return STYLE_LANGUAGE.modern;
  if (key.includes('ancient'))  return STYLE_LANGUAGE.ancient;
  return STYLE_LANGUAGE.abstract;
}

// ── Hard constraints (always appended) ───────────────────────────────────────

const CONSTRAINTS =
  'Strictly black and white monochrome, bold thick strokes minimum 2pt, ' +
  'flat 2D vector, symmetrical circular composition, ' +
  'NO text, NO letters, NO numbers, NO flags, NO national symbols, ' +
  'NO religious symbols of any religion, NO crosses, NO crescents, ' +
  'NO stars of David, NO pentagrams, NO gender symbols, ' +
  'NO faces, NO human figures, NO animals, NO birds, NO plants, NO trees, ' +
  'NO gradients, NO shadows, NO background fills, ' +
  'geometric abstraction only, production-ready for 30mm round rubber stamp';

// ── Build 4 prompts ───────────────────────────────────────────────────────────

export function buildSealPrompts(profile: {
  origin:     string[];
  occupation: string[];
  values:     string[];
  style:      string;
}): string[] {
  const originMeta  = getOriginMetaphor(profile.origin);
  const occupMeta   = getOccupationMetaphor(profile.occupation);
  const styleLang   = getStyleLanguage(profile.style);

  return [
    // Variant 1 — occupation metaphor + chosen style
    `Abstract geometric family emblem. ${occupMeta}. ${styleLang}. ${CONSTRAINTS}.`,

    // Variant 2 — origin tradition + occupation metaphor
    `Abstract geometric family emblem. ${originMeta}. ${occupMeta}. ${CONSTRAINTS}.`,

    // Variant 3 — origin tradition + modern precision
    `Abstract geometric family emblem. ${originMeta}. Swiss International Style mathematical grid precision. ${CONSTRAINTS}.`,

    // Variant 4 — combined origin + occupation, symmetric
    `Abstract geometric family emblem. Outer ring: ${originMeta}. Inner circle: ${occupMeta}. Perfectly symmetric concentric composition. ${styleLang}. ${CONSTRAINTS}.`,
  ];
}
