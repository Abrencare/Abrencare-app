export interface HealthRecord {
  id: string;
  patientId: string;
  type: 'vital' | 'lab' | 'medication' | 'note' | 'imaging';
  title: string;
  value?: string;
  unit?: string;
  recordedAt: string;
  notes?: string;
}
