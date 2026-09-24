export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'patient' | 'caregiver' | 'provider' | 'admin';
  createdAt: string;
}
