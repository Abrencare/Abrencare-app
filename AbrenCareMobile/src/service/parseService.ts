import { isCareService, type CareService } from '@/types/auth';

export function parseService(value: unknown): CareService {
  const raw = Array.isArray(value) ? value[0] : value;
  return isCareService(raw) ? raw : 'family';
}
