import * as et from 'rb/editor-types';

const attributeSchemaToProperties = schema => {
  const result = [];
  schema.forEach(attr => {
    const property = { key: attr.key };
    switch (attr.type) {
      case 'text':
        property.editor = et.text();
        break;
      case 'number':
        property.editor = et.number();
        break;
      case 'select':
        property.editor = et.select(attr.spec.options);
        break;
      case 'boolean':
        property.editor = et.checkbox();
        break;
      default:
        throw new TypeError(`Unknown attribute type ${attr.type}.`);
    }
    result.push(property);
  });
  return result;
};

export default attributeSchemaToProperties;
