import React from 'react';
import BlockSelect from 'rb/BlockSelect';
import * as et from 'rb/editor-types';

const TextArrayEditor = et.arrayOf(et.text(), '');

const SelectSpecEditor = props => {
  return (
    <div>
      Options:
      <TextArrayEditor
        value={props.value.enum}
        onChange={v => props.onChange({ enum: v })}
      />
    </div>
  );
};

const NullSpecEditor = props => null;

const typeOptions = {
  string: 'Text',
  number: 'Number',
  integer: 'Integer',
  boolean: 'Checkbox',
  select: 'Select'
};

const SchemaEntryEditor = props => {
  const { value: { key, type, required, ...spec }, onChange } = props;
  const normalizedType = Array.isArray(spec.enum) ? 'select' : type;

  const SpecEditor = {
    string: NullSpecEditor,
    number: NullSpecEditor,
    integer: NullSpecEditor,
    boolean: NullSpecEditor,
    select: SelectSpecEditor
  }[normalizedType];

  const handleKeyChange = ev => {
    const newAttribute = { ...props.value, key: ev.target.value };
    onChange && onChange(newAttribute);
  };

  const handleTypeChange = newType => {
    if (type !== newType) {
      const normalizedNewType = newType === 'select' ? 'string' : newType;
      const newAttribute = {
        key,
        required,
        type: normalizedNewType
      };
      if (newType === 'select') newAttribute.enum = [];
      onChange && onChange(newAttribute);
    }
  };

  const handleSpecChange = newSpec => {
    const newAttribute = { ...props.value, ...newSpec };
    onChange && onChange(newAttribute);
  };

  return (
    <span className="attribute-schema-editor">
      <div className="attribute-schema-key">
        <input
          className="form-control"
          placeholder="Attribute key"
          value={key}
          onChange={handleKeyChange}
        />
      </div>
      <div className="attribute-schema-type">
        <BlockSelect
          options={typeOptions}
          value={normalizedType}
          onChange={handleTypeChange}
        />
      </div>
      <div className="attribute-schema-spec">
        <SpecEditor value={spec} onChange={handleSpecChange} />
      </div>
    </span>
  );
};

export const newAttributeItem = items => {
  let num = 0;
  const name = num => 'attribute' + (num === 0 ? '' : num);
  for (;;) {
    if (!items.some(item => name(num) === item.key)) break;
    num++;
  }
  return {
    key: name(num),
    type: 'string'
  };
};

const ArrayOfAttributeSchema = et.arrayOf(SchemaEntryEditor, newAttributeItem);

const AttributeSchemaEditor = props => {
  const { value, onChange } = props;
  const handleChange = val => {
    const newValue = { type: 'object', properties: {} };
    const requiredProperties = [];
    val.forEach(entry => {
      const { key, required, ...other } = entry;
      newValue.properties[key] = other;
      if (required) requiredProperties.push(key);
    });
    if (requiredProperties.length)
      newValue.requiredProperties = requiredProperties;
    onChange(newValue);
  };

  const { properties = {}, required = [] } = value;
  const items = Object.keys(properties).map(k => {
    return {
      key: k,
      ...properties[k],
      required: required.indexOf(k) >= 0
    };
  });

  return (
    <div>
      <div className="attribute-schema-editor legend">
        <div className="attribute-schema-key">Key</div>
        <div className="attribute-schema-type">Type</div>
        <div className="attribute-schema-spec">Spec</div>
      </div>
      <ArrayOfAttributeSchema value={items} onChange={handleChange} />
    </div>
  );
};

export default AttributeSchemaEditor;
