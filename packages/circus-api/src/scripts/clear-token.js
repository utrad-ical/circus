import connectDb from '../db/connectDb';
import createValidator from '../createValidator';
import createModels from '../db/createModels';

export const options = () => {
  return [
    {
      names: ['all', 'a'],
      help: 'Also deletes permanent tokens.',
      type: 'bool'
    }
  ];
};

export const help = optionText => {
  console.log('Removes all access tokens.\n');
  console.log('Usage: node circus.js clear-token');
  console.log(optionText);
};

export const exec = async options => {
  const { all } = options;
  const db = await connectDb();
  try {
    const validator = await createValidator();
    const models = await createModels(db, validator);
    const where = all ? {} : { permanentTokenId: null };
    const res = await models.token.deleteMany(where);
    console.log(`Deleted ${res.result.n} access token(s).`);
    if (!all) {
      console.log('Use --all flag to also delete permanent tokens.');
    }
  } finally {
    await db.close();
  }
};
