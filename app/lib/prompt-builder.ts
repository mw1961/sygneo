/**
 * Builds Recraft V3 SVG prompts — strictly geometric, stamp-ready.
 * Zero animals, zero plants, zero figures, zero text, zero national/religious symbols.
 */

// ── Region → geometric art tradition ─────────────────────────────────────────

const REGION_GEOMETRY: Record<string, string> = {
  // Middle East / North Africa
  israel:          'eight-pointed geometric star with interlocking rings',
  morocco:         'twelve-pointed geometric star with tessellating polygons',
  tunisia:         'hexagonal grid with interlocking diamond shapes',
  egypt:           'nested concentric squares with radiating diagonals',
  iraq:            'ancient stepped pyramid geometric grid',
  iran:            'sixteen-sided star with arabesque grid lines',
  turkey:          'anatolian geometric lattice with interlocking hexagons',
  jordan:          'angular interlace pattern with crossing diagonals',
  lebanon:         'concentric polygon spiral with chevron border',
  yemen:           'bold angular star polygon with inner grid',
  saudi:           'geometric diamond lattice with border frame',

  // Europe — West
  france:          'gothic pointed arch geometric tracery',
  spain:           'mudéjar eight-pointed star with interlocking squares',
  portugal:        'grid of alternating interlocked squares',
  italy:           'circular rosette with radiating triangular segments',
  germany:         'bold angular cross-hatch geometric grid',
  austria:         'baroque oval medallion with concentric rings',
  switzerland:     'angular plus sign with radiating concentric squares',
  netherlands:     'diagonal grid with alternating diamond blocks',
  belgium:         'bold diagonal stripe pattern with geometric border',

  // Europe — North
  sweden:          'nordic interlace knotwork geometric',
  norway:          'viking angular knotwork interlace pattern',
  denmark:         'circular interlace ring with crossing lines',
  finland:         'angular Nordic star with concentric rings',

  // Europe — East
  poland:          'concentric square spiral with angular border',
  russia:          'bold interlocking circle and square pattern',
  ukraine:         'diamond grid with concentric angular rings',
  romania:         'hexagonal border pattern with inner star',
  hungary:         'bold angular cross with concentric ring border',
  czech:           'circular geometric medallion with triangle grid',
  bulgaria:        'angular chevron with interlocked diamond pattern',
  serbia:          'bold cross with concentric square border',
  croatia:         'checkerboard diamond pattern in circular frame',
  greece:          'Greek meander border with concentric rings',

  // UK / Ireland
  'united kingdom':'Celtic triple spiral with angular interlace',
  ireland:         'Celtic triskelion spiral geometric',

  // Americas
  'united states': 'art deco geometric starburst with concentric rings',
  canada:          'bold hexagonal snowflake geometric',
  mexico:          'stepped pyramid geometric with concentric rings',
  brazil:          'bold geometric star with angular border',
  argentina:       'radial sun-ray geometry without face',

  // Asia
  japan:           'circular Japanese mon geometric, single bold motif, extreme negative space',
  china:           'square spiral key-fret pattern',
  india:           'geometric jali lattice with octagonal stars',
  'south korea':   'taeguk-inspired concentric curve geometry',

  // Africa
  'south africa':  'angular zulu geometric beadwork pattern',
  ethiopia:        'bold cross-star geometric interlace',
  ghana:           'angular adinkra-inspired geometric',
  nigeria:         'angular geometric interlace border',

  default:         'bold concentric rings with radial spoke pattern',
};

function getRegionGeometry(origins: string[]): string {
  for (const origin of origins) {
    const key = origin.toLowerCase().trim();
    for (const [country, geo] of Object.entries(REGION_GEOMETRY)) {
      if (key.includes(country)) return geo;
    }
  }
  return REGION_GEOMETRY.default;
}

// ── Occupation → pure geometric motif ────────────────────────────────────────

const OCCUPATION_GEOMETRY: Record<string, string> = {
  farmer:       'radial spoke wheel with grain-arc segments',
  shepherd:     'concentric oval rings with dot border',
  fisherman:    'diamond wave grid with curved crossing lines',
  sailor:       'eight-point compass rose geometric',
  merchant:     'two-pan balance geometry, symmetric triangles',
  banker:       'nested squares with diagonal crossing lines',
  craftsman:    'interlocking gear-tooth ring pattern',
  blacksmith:   'bold diamond with angular hammer-head cross',
  carpenter:    'mitered corner frame with diagonal inlay',
  weaver:       'over-under diagonal grid lattice pattern',
  potter:       'concentric circles with radial dividing lines',
  jeweler:      'faceted octagon with inner star geometry',
  baker:        'bold pinwheel of equal triangular segments',
  miner:        'bold X-chevron with concentric square border',
  physician:    'square-cross geometry with concentric ring',
  scholar:      'bold open-book geometry as two triangles',
  soldier:      'bold angular shield geometry, chevron center',
  judge:        'symmetric bisected circle with balance arms',
  artist:       'bold golden-ratio spiral geometry',
  musician:     'concentric wave arcs, equal spacing',
  architect:    'bold geometric arch with proportional grid',
  engineer:     'bold cog-wheel geometry with triangular teeth',
  writer:       'angular diagonal spiral',
  diplomat:     'two interlocked rings, balanced geometry',
  hunter:       'bold angular arrow-head with concentric rings',
  gardener:     'hexagonal grid with bold center diamond',
  inventor:     'burst of radial lines with inner hexagon',
  priest:       'concentric ring sunburst, no cross or crescent',
  default:      'bold interlocking concentric ring geometry',
};

function getOccupationGeometry(occupations: string[]): string {
  for (const occ of occupations) {
    const key = occ.toLowerCase();
    for (const [k, geo] of Object.entries(OCCUPATION_GEOMETRY)) {
      if (key.includes(k)) return geo;
    }
  }
  return OCCUPATION_GEOMETRY.default;
}

// ── Values → geometric abstract form ─────────────────────────────────────────

const VALUE_GEOMETRY: Record<string, string> = {
  resilience:  'solid triangle nested in concentric rings',
  freedom:     'bold radial burst of equal lines from center',
  harmony:     'perfectly balanced yin-yang spiral geometry',
  loyalty:     'two interlocked hexagonal rings',
  wisdom:      'bold hexagonal grid with inner octagon',
  courage:     'bold diamond chevron with concentric border',
  creativity:  'expanding Fibonacci spiral geometry',
  justice:     'symmetric two-arm balance geometry',
  prosperity:  'ascending staircase of bold rectangles, circular',
  community:   'three interlocking circles, equal size',
  honor:       'bold pointed shield geometry, angular center',
  truth:       'bold circle divided by equal radial lines',
  default:     'bold six-pointed geometric star with inner circle',
};

function getValueGeometry(values: string[]): string {
  for (const val of values) {
    const key = val.toLowerCase();
    for (const [k, geo] of Object.entries(VALUE_GEOMETRY)) {
      if (key.includes(k)) return geo;
    }
  }
  return VALUE_GEOMETRY.default;
}

// ── Style language ────────────────────────────────────────────────────────────

const STYLE_LANGUAGE: Record<string, string> = {
  japanese: 'Japanese mon style: single centered motif, extreme negative space, radial symmetry',
  modern:   'Swiss International Style: mathematical grid, precise angles, clean minimal geometry',
  ancient:  'ancient craftwork: interlaced angular knotwork, layered geometric depth',
  abstract: 'pure abstract geometry: non-representational, balanced proportions',
};

function getStyleLanguage(style: string): string {
  const key = style.toLowerCase();
  if (key.includes('japanese')) return STYLE_LANGUAGE.japanese;
  if (key.includes('modern'))   return STYLE_LANGUAGE.modern;
  if (key.includes('ancient'))  return STYLE_LANGUAGE.ancient;
  return STYLE_LANGUAGE.abstract;
}

// ── Absolute constraint block ─────────────────────────────────────────────────

const FORBIDDEN =
  // Animals & nature
  'ABSOLUTELY NO animals, NO birds, NO insects, NO fish, NO reptiles, NO mythical creatures, ' +
  'NO human figures, NO faces, NO heads, NO hands, NO body parts, NO silhouettes of people, ' +
  'NO plants, NO leaves, NO trees, NO flowers, NO vines, NO branches, NO roots, NO grass, ' +
  // Religious — all faiths
  'NO religious symbols of any religion or faith, ' +
  'NO crosses, NO crucifixes, NO crescents, NO stars of David, NO menorahs, ' +
  'NO Om symbols, NO dharma wheels, NO torii gates, NO yin-yang, NO ankh, ' +
  'NO pentagrams, NO hexagrams, NO mandalas with spiritual meaning, ' +
  'NO lotus flowers, NO sacred geometry with religious meaning, ' +
  // National & political
  'NO national flags, NO country emblems, NO national symbols, NO coats of arms, ' +
  'NO political symbols, NO party symbols, NO government insignia, ' +
  'NO military insignia, NO rank symbols, NO medals, ' +
  // Gender & identity
  'NO gender symbols, NO male symbols, NO female symbols, NO gender signs, ' +
  'NO sexual imagery, NO body-related symbols, ' +
  // Offensive & extremist
  'NO swastikas, NO hate symbols, NO supremacist symbols, NO extremist imagery, ' +
  'NO offensive cultural appropriation, NO colonial symbols, ' +
  // Typography
  'NO text, NO letters, NO numbers, NO words, NO initials, NO monograms, ' +
  // Visual artifacts
  'NO gradients, NO shading, NO shadows, NO background fills, NO noise, NO texture, NO halftone';

const STAMP_REQUIREMENTS =
  'flat black-on-white vector, ' +
  'minimum stroke width 2.5mm for 30mm stamp production, ' +
  'bold clean edges, no hairlines, no thin details, ' +
  'circular or square composition 30×30mm stamp ready, ' +
  'pure SVG vector with solid fills only';

// ── Build 4 variant prompts ───────────────────────────────────────────────────

export function buildSealPrompts(profile: {
  origin:     string[];
  occupation: string[];
  values:     string[];
  style:      string;
}): string[] {
  const regionGeo   = getRegionGeometry(profile.origin);
  const occupGeo    = getOccupationGeometry(profile.occupation);
  const valueGeo    = getValueGeometry(profile.values);
  const styleLang   = getStyleLanguage(profile.style);

  const base = `heritage family seal, STRICTLY GEOMETRIC shapes only: circles rings polygons lines triangles interlace patterns, ${STAMP_REQUIREMENTS}, ${FORBIDDEN}`;

  return [
    // Variant 1 — occupation geometry + chosen style
    `${base}. Central motif: ${occupGeo}. Style: ${styleLang}.`,

    // Variant 2 — values geometry + modern precision
    `${base}. Central motif: ${valueGeo}. Style: Swiss mathematical precision, clean angular geometry.`,

    // Variant 3 — regional geometric tradition
    `${base}. Pattern: ${regionGeo}. Style: ancient craftwork geometric depth, bold strokes.`,

    // Variant 4 — combined, symmetric
    `${base}. Combined motif: ${occupGeo} integrated with ${valueGeo}. Perfectly symmetric composition. ${styleLang}.`,
  ];
}
