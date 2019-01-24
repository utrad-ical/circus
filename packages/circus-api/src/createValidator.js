import Ajv from 'ajv';
import glob from 'glob-promise';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import * as path from 'path';

const loadSchemaFiles = async schemaRoot => {
  // Search all the schema YAML files under the root directory
  const schemaFiles = await glob(path.join(schemaRoot + '/*.yaml'));
  const schemas = {};
  for (const schemaFile of schemaFiles) {
    const basename = path.basename(schemaFile, '.yaml');
    const schemaData = yaml.safeLoad(await fs.readFile(schemaFile, 'utf8'));
    if (schemaData.$async !== true || schemaData.$id) {
      throw new TypeError(
        `Schemas "${basename}" must be async and have no $id field`
      );
    }
    if (!schemaData.properties || schemaData.additionalProperties !== false) {
      throw new TypeError(
        `Schema "${basename}" must have properties.additionalProperties set to false`
      );
    }
    schemas[basename] = schemaData;
  }
  return schemas;
};

// Some custom formats
const intOrRange = '((0|[1-9][0-9]*)|(0|[1-9][0-9]*)-(0|[1-9][0-9]*))';

const customFormats = {
  dicomUid: s =>
    typeof s === 'string' &&
    s.length <= 64 &&
    /^(0|[1-9][0-9]*)(\.(0|[1-9][0-9]*))+$/.test(s),
  multiIntegerRange: new RegExp(`^${intOrRange}(,${intOrRange})*$`),
  color: /^\#[0-9a-f]{6}$/,
  kebab: /^([a-z0-9]+\-)*[a-z0-9]+$/,
  sha1hex: /^[a-f0-9]{40}$/,
  jsonString: s => {
    try {
      JSON.parse(s);
      return true;
    } catch (err) {
      return false;
    }
  }
};

const defaultSchemaRoot = path.join(__dirname, 'schemas');

/**
 * Creates the validator wrapping AJV instance.
 * This validator knows all the schemas under the 'schemas' directory
 * and can be used throughtout the API server.
 * The resulting object has two similar methods, `validate` and `validateWithDefaults`.
 */
export default async function createValidator(schemaRoot = defaultSchemaRoot) {
  const schemas = await loadSchemaFiles(schemaRoot);
  if (!Object.keys(schemas).length) console.warn('Schema directory is empty');

  const filterSchema = schemaDef => {
    if (typeof schemaDef === 'object') return schemaDef;
    if (typeof schemaDef !== 'string') throw new TypeError('Invalid schema');

    const [name, ...filterDefs] = schemaDef.split(/\s*\|\s*/);
    let schema = schemas[name];
    if (!schema) throw new TypeError('Unregistered schema name.');

    for (const filterDef of filterDefs) {
      const [filterName, ...args] = filterDef.trim().split(/\s+/);
      const filter = {
        allRequired: allRequiredScheama,
        allRequiredExcept: allRequiredScheama,
        searchResult: searchResultSchema,
        dbEntry: dbEntrySchema
      }[filterName];
      schema = filter.call(null, schema, ...args);
    }
    return schema;
  };

  /**
   * Takes a JSON schema and returns another JSON schema where
   * all properties are marked as 'required'.
   * The input JSON schema must be an object validator at the root level,
   * and must have a `properties` keyword.
   */
  const allRequiredScheama = (schema, except = '') => {
    if (!schema || !schema.properties) {
      throw new TypeError('Unsupported JSON schema');
    }
    const excepts = except.split(',').map(s => s.trim());
    const props = Object.keys(schema.properties).filter(
      p => excepts.indexOf(p) < 0
    );
    return {
      ...schema,
      required: props
    };
  };

  const withDatesSchema = schema => {
    if (!schema || !schema.properties) {
      throw new TypeError('Unsupported JSON schema');
    }
    return {
      ...schema,
      properties: {
        ...schema.properties,
        createdAt: { date: true },
        updatedAt: { date: true }
      },
      required: [...(schema.required || []), 'createdAt', 'updatedAt']
    };
  };

  const searchResultSchema = schema => {
    return {
      $async: true,
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: withDatesSchema(schema)
        },
        totalItems: { type: 'number' },
        page: { type: 'number' }
      },
      required: ['items', 'totalItems', 'page']
    };
  };

  const dbEntrySchema = schema => {
    return withDatesSchema(allRequiredScheama(schema));
  };

  const sharedOpts = {
    allErrors: true,
    removeAdditional: true,
    async: 'es7',
    format: 'full',
    formats: customFormats
  };

  function toDate(
    schema,
    data,
    parentSchema,
    path,
    parentData,
    parentDataProperty
  ) {
    const isoRegex = /(\d{4})-?(\d{2})-?(\d{2})([T ](\d{2})(:?(\d{2})(:?(\d{2}(\.\d+)?))?)?(Z|([+-])(\d{2}):?(\d{2})?)?)?/;
    if (isoRegex.test(data)) {
      parentData[parentDataProperty] = new Date(data);
      return true;
    } else {
      return false;
    }
  }

  function fromDate(
    schema,
    data,
    parentSchema,
    path,
    parentData,
    parentDataProperty
  ) {
    if (data instanceof Date) {
      parentData[parentDataProperty] = data.toISOString();
      return true;
    } else {
      return false;
    }
  }

  function checkDate(schema, data) {
    return data instanceof Date;
  }

  // We will keep several Avj instances with different options/keywords/etc
  // because Ajv does not allow changing options after `new Ajv()`.

  // The most plain validator
  const validator = new Ajv({ ...sharedOpts, schemas });
  validator.addKeyword('date', { validate: checkDate });

  // Convers ISO date strings into Date objects
  const toDateValidator = new Ajv({ ...sharedOpts, schemas });
  toDateValidator.addKeyword('date', { validate: toDate, modifying: true });

  // Convers Date objects into ISO date strings
  const fromDateValidator = new Ajv({ ...sharedOpts, schemas });
  fromDateValidator.addKeyword('date', { validate: fromDate, modifying: true });

  // Fills defaults
  const fillDefaultsValidator = new Ajv({
    ...sharedOpts,
    useDefaults: true,
    schemas
  });

  // We return an object that wraps the two Ajv instances.
  return {
    validate: async (schema, data, mode = 'default') => {
      const theSchema = filterSchema(schema);
      const validatorToUse = {
        default: validator,
        toDate: toDateValidator,
        fromDate: fromDateValidator,
        fillDefaults: fillDefaultsValidator
      }[mode];
      data = await validatorToUse.validate(theSchema, data);
      return data;
    },
    getSchema: key => {
      return validator.getSchema(key);
    },
    filterSchema
  };
}
