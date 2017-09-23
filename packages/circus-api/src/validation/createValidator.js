import Ajv from 'ajv';
import pify from 'pify';
import _glob from 'glob';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import * as path from 'path';

const glob = pify(_glob);

/**
 * Asynchronously creates the validator instance that knows all the schemas
 * and can be used throughtout the API server.
 */
export default async function createValidator() {
	const ajv = new Ajv({ allErrors: true, useDefaults: true });

	// Install all the schema YAML files under "schemas" directory
	const schemaFiles = await glob(path.join(__dirname, '../schemas/*.yaml'));
	const schemas = await Promise.all(schemaFiles.map(
		file => fs.readFile(file, 'utf8').then(yaml.safeLoad)
	));
	schemas.forEach(s => ajv.addSchema(s)); // Make sure each schema has id's

	// Add custom formats
	const formats = {
		dicomUid: s => (typeof s === 'string' &&
			s.length <= 64 &&
			/^(0|[1-9][0-9]*)(\.(0|[1-9][0-9]*))+$/.test(s)
		),
		multiIntegerRange: /^([1-9][0-9]*|[1-9][0-9]*-[1-9][0-9]*)(,([1-9][0-9]*|[1-9][0-9]*-[1-9][0-9]*))*$/,
	};
	Object.keys(formats).forEach(f => ajv.addFormat(f, formats[f]));

	return ajv;
}