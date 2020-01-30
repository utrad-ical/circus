import readDicomTags from './readDicomTags';
import fs from 'fs-extra';
import path from 'path';

test('readDicomTags', async () => {
  const content = await fs.readFile(
    path.join(__dirname, '../../test/dicom/CT-MONO2-16-brain.dcm')
  );
  const result = readDicomTags(content);
  // console.log(result);
});
