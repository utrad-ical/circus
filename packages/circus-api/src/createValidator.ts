import Ajv from 'ajv';
import glob from 'glob-promise';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import semver from 'semver';
import * as path from 'path';
import { isDicomUid } from '@utrad-ical/circus-lib/lib/validation';
import { NoDepFunctionService } from '@utrad-ical/circus-lib';
import { Validator } from './interface';

const loadSchemaFiles = async (schemaRoot: string) => {
  // Search all the schema YAML files under the root directory
  const schemaFiles = await glob(path.join(schemaRoot + '/*.yaml'));
  const schemas: { [name: string]: any } = {};
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

const customFormats: {
  [formatName: string]: ((s: string) => boolean) | RegExp;
} = {
  dicomUid: s => isDicomUid(s, false),
  multiIntegerRange: new RegExp(`^${intOrRange}(,${intOrRange})*$`),
  color: /^#[0-9a-f]{6}$/,
  kebab: /^([a-z0-9]+-)*[a-z0-9]+$/,
  sha1hex: /^[a-f0-9]{40}$/,
  jsonString: s => {
    try {
      JSON.parse(s);
      return true;
    } catch (err) {
      return false;
    }
  },
  dockerId: s => /^[a-z0-9]{64}$/.test(s),
  semver: s => semver.valid(s) !== null
};

const defaultSchemaRoot = path.join(__dirname, 'schemas');

type SchemaConverter = (schema: any, ...params: string[]) => any;

/**
 * Creates the validator wrapping AJV instance.
 * This validator knows all the schemas under the 'schemas' directory
 * and can be used throughtout the API server.
 */
const createValidator: NoDepFunctionService<
  Validator,
  { schemaRoot: string } | undefined
> = async opts => {
  const schemaRoot =
    opts && opts.schemaRoot ? opts.schemaRoot : defaultSchemaRoot;
  const schemas = await loadSchemaFiles(schemaRoot);
  if (!Object.keys(schemas).length) console.warn('Schema directory is empty');

  const filterSchema = (schemaDef: string | object) => {
    if (typeof schemaDef === 'object') return schemaDef;
    if (typeof schemaDef !== 'string') throw new TypeError('Invalid schema');

    const [name, ...filterDefs] = schemaDef.split(/\s*\|\s*/);
    let schema = schemas[name];
    if (!schema) throw new TypeError('Unregistered schema name.');

    for (const filterDef of filterDefs) {
      const [filterName, ...args] = filterDef.trim().split(/\s+/);
      const filter = ({
        allRequired: allRequiredScheama,
        allRequiredExcept: allRequiredScheama,
        only: onlySchema,
        exclude: excludeSchema,
        addProperty: addPropertySchema,
        searchResult: searchResultSchema,
        dbEntry: dbEntrySchema
      } as { [name: string]: SchemaConverter })[filterName];
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
  const allRequiredScheama: SchemaConverter = (schema, except = '') => {
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

  /**
   * Takes a JSON schema and returns its subset JSON schema
   * which only contains the specified properties.
   * The input JSON schema must be an object validator at the root level,
   * and must have a `properties` keyword.
   */
  const onlySchema: SchemaConverter = (schema, props: string) => {
    if (!schema || !schema.properties) {
      throw new TypeError('Unsupported JSON schema');
    }
    const propList = props.split(',').map(s => s.trim());
    const properties: any = {};
    propList.forEach(key => {
      properties[key] = schema.properties[key];
    });
    return {
      ...schema,
      properties,
      additionalProperties: false
    };
  };

  const excludeSchema: SchemaConverter = (schema, props: string) => {
    if (!schema || !schema.properties) {
      throw new TypeError('Unsupported JSON schema');
    }
    const propList = props.split(',').map(s => s.trim());
    const properties = { ...schema.properties };
    propList.forEach(key => delete properties[key]);
    return { ...schema, properties };
  };

  const addPropertySchema: SchemaConverter = (
    schema,
    name: string,
    ref: string
  ) => {
    const properties = { ...schema.properties, [name]: { $ref: ref } };
    return { ...schema, properties };
  };

  const withDatesSchema: SchemaConverter = schema => {
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

  const searchResultSchema: SchemaConverter = schema => {
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

  const dbEntrySchema: SchemaConverter = schema => {
    return withDatesSchema(allRequiredScheama(schema));
  };

  const sharedOpts = {
    allErrors: true,
    async: 'es7',
    format: 'full',
    formats: customFormats
  };

  const toDate: Ajv.SchemaValidateFunction = (
    schema,
    data,
    parentSchema,
    path,
    parentData,
    parentDataProperty
  ) => {
    const isoRegex = /(\d{4})-?(\d{2})-?(\d{2})([T ](\d{2})(:?(\d{2})(:?(\d{2}(\.\d+)?))?)?(Z|([+-])(\d{2}):?(\d{2})?)?)?/;
    if (isoRegex.test(data)) {
      (parentData as any)[parentDataProperty!] = new Date(data);
      return true;
    } else {
      return false;
    }
  };

  const fromDate: Ajv.SchemaValidateFunction = (
    schema,
    data,
    parentSchema,
    path,
    parentData,
    parentDataProperty
  ) => {
    if (data instanceof Date) {
      (parentData as any)[parentDataProperty!] = data.toISOString();
      return true;
    } else {
      return false;
    }
  };

  function checkDate(schema: any, data: any) {
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
    validate: async (schema: any, data: any, mode = 'default') => {
      const theSchema = filterSchema(schema);
      const validators: { [mode: string]: Ajv.Ajv } = {
        default: validator,
        toDate: toDateValidator,
        fromDate: fromDateValidator,
        fillDefaults: fillDefaultsValidator
      };
      const validatorToUse = validators[mode];
      data = await validatorToUse.validate(theSchema, data);
      return data;
    },
    getSchema: (key: string) => {
      return validator.getSchema(key);
    },
    filterSchema
  } as Validator;
};

export default createValidator;
