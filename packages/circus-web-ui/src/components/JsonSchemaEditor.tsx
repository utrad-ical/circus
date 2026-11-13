import classnames from 'classnames';
import React, {
  type FC,
  Fragment,
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react';
import Input from './Input.tsx';
import styles from './JsonSchemaEditor.module.css';
import Select from './Select.tsx';

export interface PropSchema {
  type: 'string' | 'number' | 'integer' | 'boolean';
  // For enum
  enum?: (number | string)[];
  // For string type
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  // For number/integer type
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
}

export interface Schema<T extends object = any> {
  type: 'object';
  properties: { [key in keyof T]: PropSchema };
  required?: (keyof T)[];
}

type PropEdit<T> = FC<{
  value: T;
  onChange: (value: T | undefined) => void;
  disabled?: boolean;
  onValidate: (valid: boolean) => void;
  schema: PropSchema;
  required: boolean;
}>;

const ValidatingTextProp: FC<{
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
  onValidate: (valid: boolean) => void;
  validator: (value: string) => boolean;
  required?: boolean;
}> = props => {
  const { value, onChange, disabled, onValidate, validator, required } = props;
  const [input, setInput] = useState(value ?? '');
  const [valid, setValid] = useState(false);

  const isValid = (val: string | undefined) =>
    val === undefined ? !required : validator(val);

  useEffect(() => {
    const valid = isValid(value);
    setValid(valid);
    onValidate(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on the first render

  const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    setInput(ev.target.value);
    const val = ev.target.value.length ? ev.target.value : undefined;
    const valid = isValid(val);
    setValid(valid);
    onValidate(valid);
    if (valid) onChange(val);
  };

  return (
    <Input
      size="small"
      aria-invalid={!valid}
      value={input}
      disabled={disabled}
      onChange={handleChange}
    />
  );
};

const StringProp: PropEdit<string> = props => {
  const { value, onChange, disabled, onValidate, schema, required } = props;
  const { pattern, minLength, maxLength } = schema;
  const validator = useCallback(
    (val: string) => {
      if (typeof minLength === 'number' && minLength > 0) {
        if (val.length < minLength) return false;
      }
      if (typeof maxLength === 'number' && maxLength > 0) {
        if (val.length > maxLength) return false;
      }
      if (typeof pattern === 'string' && !RegExp(pattern).test(val)) {
        return false;
      }
      return true;
    },
    [maxLength, minLength, pattern]
  );
  return (
    <ValidatingTextProp
      value={value}
      onChange={onChange}
      disabled={disabled}
      onValidate={onValidate}
      required={required}
      validator={validator}
    />
  );
};

const NumberProp: PropEdit<number> = props => {
  const { value, onChange, disabled, onValidate, schema, required } = props;
  const { type, minimum, maximum, exclusiveMinimum, exclusiveMaximum } = schema;
  const isInt = type === 'integer';

  const validator = useCallback(
    (val: string) => {
      const pattern = isInt ? /^-?\d+$/ : /^-?\d+(\.\d+)?$/;
      if (!pattern.test(val)) return false;
      const parsed = Number(val);
      if (typeof minimum === 'number' && minimum > parsed) return false;
      if (typeof exclusiveMinimum === 'number' && exclusiveMinimum >= parsed)
        return false;
      if (typeof maximum === 'number' && maximum < parsed) return false;
      if (typeof exclusiveMaximum === 'number' && exclusiveMaximum <= parsed)
        return false;
      return true;
    },
    [exclusiveMaximum, exclusiveMinimum, isInt, maximum, minimum]
  );

  const handleChange = useCallback(
    (val: string | undefined) =>
      onChange(val === undefined ? undefined : Number(val)),
    [onChange]
  );

  return (
    <ValidatingTextProp
      value={typeof value === 'number' ? String(value) : undefined}
      onChange={handleChange}
      disabled={disabled}
      onValidate={onValidate}
      required={required}
      validator={validator}
    />
  );
};

// The key of the empty choice; other choices are keyed by their index
const UNSELECTED = '';

const EnumProp: PropEdit<any> = props => {
  const { value, onChange, disabled, onValidate, schema, required } = props;
  const { enum: options } = schema;
  const [input, setInput] = useState<string | number | undefined>(value);

  if (!options || !options.length) throw new Error('enum not set');

  useEffect(() => {
    onValidate(value === undefined ? !required : options.includes(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on the first render

  const handleChange = (key: string) => {
    if (key === UNSELECTED) {
      setInput(undefined);
      onValidate(!required);
      if (!required) onChange(undefined);
    } else {
      const option = options[Number(key)];
      setInput(option);
      onValidate(true);
      onChange(option);
    }
  };

  const choices: { [key: string]: string } = { [UNSELECTED]: '(none)' };
  options.forEach((o, i) => (choices[i] = String(o)));

  const invalid = input === undefined ? required : !options.includes(input);
  return (
    <Select
      size="small"
      className={classnames(invalid && styles.invalid)}
      options={choices}
      value={input === undefined ? UNSELECTED : String(options.indexOf(input))}
      disabled={disabled}
      onChange={handleChange}
    />
  );
};

const BooleanProp: PropEdit<boolean> = props => {
  const { value, onChange, disabled, onValidate, required } = props;
  const valid =
    typeof value === 'boolean' || (!required && typeof value === 'undefined');

  useEffect(() => {
    onValidate(valid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on the first render

  const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    onValidate(true);
    onChange(ev.target.value === 'true');
  };

  return (
    <div className={classnames(styles.radios, !valid && styles.invalid)}>
      {[true, false].map(v => (
        <label key={String(v)}>
          <input
            type="radio"
            checked={value === v}
            value={String(v)}
            disabled={disabled}
            onChange={handleChange}
          />
          {String(v)}
        </label>
      ))}
    </div>
  );
};

const Prop: PropEdit<any> = props => {
  const { schema } = props;
  const Editor: PropEdit<any> | undefined = Array.isArray(schema.enum)
    ? EnumProp
    : {
        string: StringProp,
        number: NumberProp,
        integer: NumberProp,
        boolean: BooleanProp
      }[schema.type];
  if (!Editor) throw new TypeError('Unsupported value type');
  return <Editor {...props} />;
};

/**
 * Edits key-value pairs whose shape is determined by a subset of JSON Schema.
 * `value` is only the initial value; `onChange` is called only with
 * a valid value, and `onValidate` reports the validity.
 */
const JsonSchemaEditor = <T extends object = any>(props: {
  value: Partial<T>;
  schema: Schema<T>;
  onChange: (value: Partial<T>) => void;
  onValidate: (valid: boolean) => void;
  disabled?: boolean;
}): ReactElement | null => {
  const { value, onChange, disabled, onValidate, schema } = props;
  const [current, setCurrent] = useState({ ...value });
  const valids = useRef<Map<keyof T, boolean>>(new Map()).current;

  if (
    typeof schema !== 'object' ||
    ('type' in schema && schema.type !== 'object') ||
    ('properties' in schema && typeof schema.properties !== 'object')
  ) {
    throw new TypeError('Invalid or unsupported JSON schema');
  }
  if (!schema.properties) return null;

  const keys = Object.keys(schema.properties) as (keyof T)[];
  const required = Array.isArray(schema.required) ? schema.required : [];

  const handleChange = (key: keyof T, val: any) => {
    const newValue: any = { ...current, [key]: val };
    if (val === undefined) delete newValue[key];
    valids.set(key, true);
    setCurrent(newValue);
    if (keys.every(k => valids.get(k) === true)) onChange(newValue);
  };

  const handleValidate = (key: keyof T, valid: boolean) => {
    valids.set(key, valid);
    if (keys.every(k => valids.has(k))) {
      onValidate(keys.every(k => valids.get(k) === true));
    }
  };

  return (
    <div className={styles.editor}>
      {keys.map(k => (
        <Fragment key={k as string}>
          <span className={styles.key}>{k as string}</span>
          <Prop
            schema={schema.properties[k]}
            required={required.includes(k)}
            value={current[k]}
            disabled={disabled}
            onChange={val => handleChange(k, val)}
            onValidate={valid => handleValidate(k, valid)}
          />
        </Fragment>
      ))}
    </div>
  );
};

export default JsonSchemaEditor;
