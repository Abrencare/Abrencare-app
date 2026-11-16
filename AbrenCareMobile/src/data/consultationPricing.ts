/**
 * Consultation is the first AbrenCare service that charges before the visit.
 * Video and audio use the same fee so Consult Now cannot undercut booking.
 */
export const CONSULTATION_PRICE_ETB = 450;

export type VisitKind = 'video' | 'audio';

export function formatEtb(amount: number) {
  return `${amount} ETB`;
}

export function priceLabel(kind: VisitKind) {
  return kind === 'audio' ? 'Audio visit' : 'Video visit';
}

export function parseVisitKind(value: unknown): VisitKind {
  if (value === 'audio' || value === 'message') {
    return 'audio';
  }
  return 'video';
}
