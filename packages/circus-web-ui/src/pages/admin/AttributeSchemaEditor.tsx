import classnames from 'classnames';
import Input from '#components/Input.tsx';
import React from 'react';
import Select from '#components/Select.tsx';
import * as et from '#components/editorTypes.tsx';
import type { Schema, PropSchema } from '#components/JsonSchemaEditor.tsx';
import styles from './AttributeSchemaEditor.module.css';

const TextArrayEditor = et.arrayOf(et.text(), () => '');

const SelectSpecEditor: React.FC<{
  value: { enum: string[] };
  onChange: (value: { enum: string[] }) => void;
}> = props => {
  return (
    <div className={styles.selectSpec}>
      Options:
      <TextArrayEditor
        value={props.value.enum}
        onChange={(v: string[]) => props.onChange({ enum: v })}
      />
    </div>
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

interface SchemaEntryEditorValue {
  key: string;
  schema: PropSchema;
  required: boolean;
}

const SchemaEntryEditor: React.FC<{
  value: SchemaEntryEditorValue;
  onChange: (value: SchemaEntryEditorValue) => void;
}> = props => {
  const {
    value: { key, schema, required },
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

  const handleTypeChange = (value: string | number) => {
    const newType = value as SchemaEntryType | 'select';
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

  const handleRequiredChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const required = !!ev.target.checked;
    console.log(required, 'desu');
    onChange({ ...props.value, required });
  };

  const handleSpecChange = (newSpec: PropSchema) => {
    const newAttribute: SchemaEntryEditorValue = {
      ...props.value,
      schema: newSpec
    };
    onChange(newAttribute);
  };

  return (
    <span className={styles.row}>
      <div className={styles.key}>
        <Input
          placeholder="Attribute key"
          value={key}
          onChange={handleKeyChange}
        />
      </div>
      <div className={styles.required}>
        <input
          type="checkbox"
          checked={required}
          onChange={handleRequiredChange}
          title="Required"
        />
      </div>
      <div className={styles.type}>
        <Select
          block
          options={typeOptions}
          value={normalizedType}
          onChange={handleTypeChange}
        />
      </div>
      <div className={styles.spec}>
        <SpecEditor value={schema} onChange={handleSpecChange} />
      </div>
    </span>
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
      required: val.filter(v => v.required).map(v => v.key)
    };
    val.forEach(entry => (newValue.properties[entry.key] = entry.schema));
    onChange(newValue);
  };

  const { properties = {}, required = [] } = value;
  const items: SchemaEntryEditorValue[] = Object.keys(properties).map(k => ({
    key: k,
    required: required.indexOf(k) >= 0,
    schema: properties[k]
  }));

  return (
    <div>
      <span className={classnames(styles.row, styles.legend)}>
        <div className={styles.key}>Key</div>
        <div className={styles.required}>Required</div>
        <div className={styles.type}>Type</div>
        <div className={styles.spec}>Spec</div>
      </span>
      <ArrayOfAttributeSchema value={items} onChange={handleChange} />
    </div>
  );
};

export default AttributeSchemaEditor;
