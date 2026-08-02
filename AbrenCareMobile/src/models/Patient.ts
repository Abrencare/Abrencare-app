import { User } from './User';

export interface Patient extends User {
  dateOfBirth: string;
  phoneNumber?: string;
  bloodType?: string;
  emergencyContact?: string;
  conditions?: string[];
}
