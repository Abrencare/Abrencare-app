export interface Alert {
  id: string;
  patientId: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
  acknowledged?: boolean;
}
