export type Sex = 'M' | 'F' | 'O';

export default interface PatientInfo {
  readonly patientName?: string;
  readonly age?: number;
  readonly sex?: Sex;
  readonly patientId?: string;
  readonly birthDate?: string;
  readonly size?: number;
  readonly weight?: number;
}
