import React from 'react';
import BlockSelect from 'rb/BlockSelect';
import * as et from 'rb/editor-types';

const TextArrayEditor = et.arrayOf(et.text(), '');

const SelectSpecEditor = props => {
  return (
    <div>
      Options:
      <TextArrayEditor
        value={props.value.options}
        onChange={v => props.onChange({ options: v })}
      />
    </div>
  );
};

const NullSpecEditor = props => null;

const AttributeSchemaEditor = props => {
  const { value: { key, type, spec = {} }, onChange } = props;

  const typeOptions = {
    text: 'Text',
    number: 'Number',
    select: 'Select',
    boolean: 'Checkbox'
  };

  const SpecEditor = {
    text: NullSpecEditor,
    number: NullSpecEditor,
    select: SelectSpecEditor,
    boolean: NullSpecEditor
  }[type];

  const handleKeyChange = ev => {
    const newAttribute = { ...props.value, key: ev.target.value };
    onChange && onChange(newAttribute);
  };

  const handleTypeChange = newType => {
    if (type !== newType) {
      const newAttribute = {
        key,
        type: newType,
        spec: {}
      };
      onChange && onChange(newAttribute);
    }
  };

  const handleSpecChange = newSpec => {
    const newAttribute = { ...props.value, spec: newSpec };
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
          value={type}
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
    type: 'text',
    spec: {}
  };
};

const ArrayOfAttributeSchema = et.arrayOf(
  AttributeSchemaEditor,
  newAttributeItem
);

const AttributeSchemaArrayEditor = props => (
  <div>
    <div className="attribute-schema-editor legend">
      <div className="attribute-schema-key">Key</div>
      <div className="attribute-schema-type">Type</div>
      <div className="attribute-schema-spec">Spec</div>
    </div>
    <ArrayOfAttributeSchema {...props} />
  </div>
);

export default AttributeSchemaArrayEditor;
