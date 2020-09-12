import PatientInfo from './PatientInfo';

export default interface Series {
  seriesUid: string;
  modality: string;
  studyUid: string;
  seriesDescription: string;
  images: string; // of multi-integer-range
  seriesDate: string;
  patientInfo?: PatientInfo;
  createdAt: string;
  updatedAt: string;
  parameters: any;
}
