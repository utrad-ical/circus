import PatientInfo from './PatientInfo';

export default interface Series {
  seriesUid: string;
  modality: string;
  studyUid: string;
  seriesDescription: string;
  width: number;
  height: number;
  images: string; // of multi-integer-range
  seriesDate: string;
  patientInfo?: PatientInfo;
  modelName?: string;
  manufacturer?: string;
  createdAt: string;
  updatedAt: string;
  parameters: any;
}
