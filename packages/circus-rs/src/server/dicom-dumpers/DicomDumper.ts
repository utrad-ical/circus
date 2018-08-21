import { SeriesAccessor } from '@utrad-ical/circus-dicom-repository/lib/DicomFileRepository';
import DicomVolume from '../../common/DicomVolume';

/**
 * Base DICOM Dumper class.
 */
abstract class DicomDumper {
  protected config: any = null;

  constructor(config: any) {
    this.config = config;
    this.initialize();
  }

  protected initialize(): void {
    // abstract
  }

  /**
   * read header/image from DICOM data.
   *
   * @param seriesAccessor series accessor function
   * @param config request specific parameter (if needed)
   */
  public abstract readDicom(
    seriesAccessor: SeriesAccessor,
    config: any
  ): Promise<DicomVolume>;
}

export default DicomDumper;
