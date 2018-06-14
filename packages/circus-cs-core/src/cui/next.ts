import * as ajv from 'ajv';
import processNextJob from '../functions/process-next-job';

const argumentsSchema = {
  type: 'object'
};

export default async function next(argv: any) {
  const argCheck = new ajv().compile(argumentsSchema)(argv);

  if (!argCheck) {
    console.error('Argument is something wrong.');
    process.exit(1);
  }

  try {
    const stdout = await processNextJob();
    console.log(stdout);
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
