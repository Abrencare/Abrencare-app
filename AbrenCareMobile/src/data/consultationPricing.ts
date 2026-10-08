/**
 * Consultation is the first AbrenCare service that charges before the visit.
 * Video and message use the same fee so Consult Now cannot undercut booking.
 */
export const CONSULTATION_PRICE_ETB = 450;

export type VisitKind = 'video' | 'message';

export function formatEtb(amount: number) {
  return `${amount} ETB`;
}

export function priceLabel(kind: VisitKind) {
  return kind === 'video' ? 'Video visit' : 'Message visit';
}
