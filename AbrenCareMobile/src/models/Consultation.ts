export interface Consultation {
  id: string;
  patientId: string;
  providerName: string;
  specialty: string;
  scheduledAt: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
}
