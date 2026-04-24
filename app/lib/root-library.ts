/**
 * SEAL Root Library — Core Governance Rules
 * Version: 1.0
 *
 * Three layers:
 *   1. Security & Privacy
 *   2. QA & Production Standards
 *   3. Change Control
 */

// ── 1. Security & Privacy ─────────────────────────────────────────────────────

export const FORBIDDEN_SYMBOLS: RegExp[] = [
  /swastika|hakenkreuz|nazi/i,
  /kkk|white.supremac/i,
  /isis|jihad|terror/i,
  /\bss\b.*skull/i,
];

export const PRIVATE_KEY_PATTERNS: RegExp[] = [
  /private.?key/i,
  /secret.?key/i,
  /0x[a-fA-F0-9]{40,}/,  // Ethereum private key
];

export function validateSealSafety(input: string): { ok: boolean; reason?: string } {
  for (const pattern of FORBIDDEN_SYMBOLS) {
    if (pattern.test(input)) {
      return { ok: false, reason: `Forbidden symbol detected: ${pattern.source}` };
    }
  }
  for (const pattern of PRIVATE_KEY_PATTERNS) {
    if (pattern.test(input)) {
      return { ok: false, reason: 'Private key pattern detected — never store in plain text' };
    }
  }
  return { ok: true };
}

// ── 2. QA & Production Standards ─────────────────────────────────────────────

export const VECTOR_SPECS = {
  minStrokeWidth: 1.5,       // pt — minimum for laser/CNC production
  colorMode: 'monochrome',   // single solid color only
  pathsClosed: true,         // all paths must be closed
  format: ['SVG', 'DXF'],
  noText: true,              // no text elements allowed in seal
} as const;

export type SealShape = 'circle' | 'square' | 'triangle';
export type SealStyle = 'japanese' | 'modern' | 'ancient' | 'abstract';

export interface SealProfile {
  id: string;
  roots: {
    origin: string;
    historicOccupation: string;
  };
  values: string[];           // 2-3 core values
  visual: {
    shape: SealShape;
    style: SealStyle;
    inkColor: string;         // hex, single color
  };
  createdAt: string;
}

export function validateVectorSpecs(svgContent: string): { ok: boolean; issues: string[] } {
  const issues: string[] = [];

  if (/<text/i.test(svgContent)) {
    issues.push('Text elements found — seals must contain no text');
  }
  if (/stroke-width:\s*([0-9.]+)/g.test(svgContent)) {
    const match = svgContent.match(/stroke-width:\s*([0-9.]+)/);
    if (match && parseFloat(match[1]) < VECTOR_SPECS.minStrokeWidth) {
      issues.push(`Stroke width ${match[1]}pt is below minimum ${VECTOR_SPECS.minStrokeWidth}pt`);
    }
  }

  return { ok: issues.length === 0, issues };
}

// ── 3. Change Control ─────────────────────────────────────────────────────────

export const CHANGE_CHECKLIST = [
  'No text in SVG output',
  'All paths closed',
  'Stroke width ≥ 1.5pt',
  'Monochrome output only',
  'No forbidden symbols',
  'Unique vs. archive (≥80% difference)',
  'TypeScript compiles clean',
] as const;

export type ChecklistItem = typeof CHANGE_CHECKLIST[number];
