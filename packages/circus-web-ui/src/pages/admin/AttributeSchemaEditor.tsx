import React from 'react';
import BlockSelect from '@smikitky/rb-components/lib/BlockSelect';
import * as et from '@smikitky/rb-components/lib/editor-types';
import styled from 'styled-components';

const TextArrayEditor = et.arrayOf(et.text(), '');

const SelectSpecEditorDiv = styled.div`
  li {
    display: flex;
  }
`;

const SelectSpecEditor: React.FC<{
  value: { enum: string[] };
  onChange: (value: { enum: string[] }) => void;
}> = props => {
  return (
    <SelectSpecEditorDiv>
      Options:
      <TextArrayEditor
        value={props.value.enum}
        onChange={(v: string[]) => props.onChange({ enum: v })}
      />
    </SelectSpecEditorDiv>
  );
};

const NullSpecEditor: React.FC<{}> = props => null;

const typeOptions = {
  string: 'Text',
  number: 'Number',
  integer: 'Integer',
  boolean: 'Checkbox',
  select: 'Select'
};

type SchemaEntryType = 'string' | 'number' | 'integer' | 'boolean';

interface SchemaEntry {
  type: SchemaEntryType;
  enum?: string[];
}

interface Schema {
  type: 'object';
  properties: { [key: string]: SchemaEntry };
  required: string[];
}

interface SchemaEntryEditorValue {
  key: string;
  schema: SchemaEntry;
}

const StyledSpan = styled.span`
  &.legend {
    font-weight: bolder;
  }
  width: 95%;
  display: inline-flex;
  flex-direction: row;
  .attribute-schema-key {
    width: 25%;
    margin-right: 3px;
  }
  .attribute-schema-type {
    width: 20%;
    margin-right: 3px;
  }
  .attribute-schema-spec {
    flex-grow: 1;
    input {
      display: inline;
    }
  }
`;

const SchemaEntryEditor: React.FC<{
  value: SchemaEntryEditorValue;
  onChange: (value: SchemaEntryEditorValue) => void;
}> = props => {
  const {
    value: { key, schema },
    onChange
  } = props;
  const normalizedType = Array.isArray(schema.enum) ? 'select' : schema.type;

  const SpecEditor: React.FC<{
    value: any;
    onChange: (value: any) => void;
  }> = {
    string: NullSpecEditor,
    number: NullSpecEditor,
    integer: NullSpecEditor,
    boolean: NullSpecEditor,
    select: SelectSpecEditor
  }[normalizedType];

  const handleKeyChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const newAttribute: SchemaEntryEditorValue = {
      ...props.value,
      key: ev.target.value
    };
    onChange(newAttribute);
  };

  const handleTypeChange = (newType: SchemaEntryType | 'select') => {
    if (normalizedType !== newType) {
      const normalizedNewType = newType === 'select' ? 'string' : newType;
      const newAttribute: SchemaEntryEditorValue = {
        ...props.value,
        schema: { type: normalizedNewType }
      };
      if (newType === 'select') newAttribute.schema.enum = [];
      onChange(newAttribute);
    }
  };

  const handleSpecChange = (newSpec: SchemaEntry) => {
    const newAttribute: SchemaEntryEditorValue = {
      ...props.value,
      schema: newSpec
    };
    onChange(newAttribute);
  };

  return (
    <StyledSpan>
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
        <SpecEditor value={schema} onChange={handleSpecChange} />
      </div>
    </StyledSpan>
  );
};

export const newAttributeItem = (items: SchemaEntryEditorValue[]) => {
  let num = 0;
  const name = (num: number) => 'attribute' + (num === 0 ? '' : num);
  for (;;) {
    if (!items.some(item => name(num) === item.key)) break;
    num++;
  }
  return {
    key: name(num),
    schema: { type: 'string' }
  } as SchemaEntryEditorValue;
};

const ArrayOfAttributeSchema = et.arrayOf(SchemaEntryEditor, newAttributeItem);

const AttributeSchemaEditor: React.FC<{
  value: Schema;
  onChange: (value: Schema) => void;
}> = props => {
  const { value, onChange } = props;

  const handleChange = (val: SchemaEntryEditorValue[]) => {
    const newValue: Schema = {
      type: 'object',
      properties: {},
      required: val.map(v => v.key)
    };
    val.forEach(entry => (newValue.properties[entry.key] = entry.schema));
    onChange(newValue);
  };

  const { properties = {}, required = [] } = value;
  const items: SchemaEntryEditorValue[] = Object.keys(properties).map(k => {
    return {
      key: k,
      required: required.indexOf(k) >= 0,
      schema: properties[k]
    };
  });

  return (
    <div>
      <StyledSpan className="legend">
        <div className="attribute-schema-key">Key</div>
        <div className="attribute-schema-type">Type</div>
        <div className="attribute-schema-spec">Spec</div>
      </StyledSpan>
      <ArrayOfAttributeSchema value={items} onChange={handleChange} />
    </div>
  );
};

export default AttributeSchemaEditor;
