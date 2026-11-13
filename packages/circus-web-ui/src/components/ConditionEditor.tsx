import { format, isValid, parse } from 'date-fns';
import React, { type FC, type ReactElement } from 'react';
import { escapeRegExp } from '#utils/util.ts';
import normalizeOptions, {
  type SelectOptions
} from '#utils/normalizeOptions.ts';
import Button from './Button.tsx';
import styles from './ConditionEditor.module.css';
import DatePicker from './DatePicker.tsx';
import Input from './Input.tsx';
import { normalizeRelative } from './RelativeDatePicker.tsx';
import Select from './Select.tsx';

type KeyType = 'number' | 'text' | 'select' | 'date';

export interface Keys {
  [key: string]: { type: KeyType; caption: string; spec?: any };
}

export type Operator =
  | '=='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | '^='
  | '$='
  | '*=';

export interface SingleNode {
  keyName: string;
  op: Operator;
  value: any;
}

export type GroupNode = { $and: Node[] } | { $or: Node[] };

export type Node = GroupNode | SingleNode;

export type Condition = GroupNode;

type ControlProps = {
  spec: any;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
};

const dateFormat = 'yyyy-MM-dd';

const typeMap: {
  [type in KeyType]: {
    operators: { [op: string]: string };
    control: FC<ControlProps>;
    // Converts the value when the key is changed to this type
    convert: (input: any, spec: any) => any;
  };
} = {
  number: {
    operators: { '==': '=', '>': '>', '<': '<', '>=': '>=', '<=': '<=' },
    control: props => (
      <Input
        type="number"
        value={props.value}
        onChange={ev => props.onChange(parseFloat(ev.target.value))}
        disabled={props.disabled}
      />
    ),
    convert: input => (isNaN(parseFloat(input)) ? 0 : parseFloat(input))
  },
  text: {
    operators: {
      '==': 'is',
      '!=': 'is not',
      '^=': 'begins with',
      '$=': 'ends with',
      '*=': 'contains'
    },
    control: props => (
      <Input
        value={props.value}
        onChange={ev => props.onChange(ev.target.value)}
        disabled={props.disabled}
      />
    ),
    convert: input => (input !== undefined ? String(input) : '')
  },
  select: {
    operators: { '==': 'is', '!=': 'is not' },
    control: props => (
      <Select
        options={props.spec.options}
        value={props.value}
        onChange={props.onChange}
        disabled={props.disabled}
      />
    ),
    convert: (input, spec) => {
      const options = normalizeOptions(spec.options as SelectOptions);
      return input in options ? input : Object.keys(options)[0];
    }
  },
  date: {
    operators: { '==': 'is', '>': '>', '<': '<', '>=': '>=', '<=': '<=' },
    control: props => (
      <DatePicker
        value={props.value}
        onChange={props.onChange}
        disabled={props.disabled}
      />
    ),
    convert: input => {
      const date = parse(String(input), dateFormat, new Date());
      return format(isValid(date) ? date : new Date(), dateFormat);
    }
  }
};

interface NodeProps<T> {
  keys: Keys;
  value: T;
  onChange: (node: T) => void;
  onRemove: () => void;
  // Whether this node can be removed
  removable: boolean;
  disabled?: boolean;
}

const newSingleNode = (keys: Keys): SingleNode => ({
  keyName: Object.keys(keys)[0],
  op: '==',
  value: ''
});

const ToolButton: FC<{
  icon: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}> = props => {
  const { icon, title, onClick, disabled } = props;
  return (
    <Button
      variant="link"
      icon={icon}
      title={title}
      onClick={onClick}
      disabled={disabled}
    />
  );
};

const ConditionNode = (props: NodeProps<Node>): ReactElement => {
  const { value } = props;
  return '$and' in value || '$or' in value ? (
    <GroupCondition {...(props as NodeProps<GroupNode>)} />
  ) : (
    <SingleCondition {...(props as NodeProps<SingleNode>)} />
  );
};

const GroupCondition: FC<NodeProps<GroupNode>> = props => {
  const { keys, value, onChange, onRemove, removable, disabled } = props;
  const groupType = '$and' in value ? '$and' : '$or';
  const members: Node[] = '$and' in value ? value.$and : value.$or;

  const update = (members: Node[], type = groupType) => {
    if (members.length) onChange({ [type]: members } as GroupNode);
    else onRemove();
  };

  const handleMemberChange = (index: number, member: Node) => {
    const next = members.slice();
    next[index] = member;
    update(next);
  };

  return (
    <div className={styles.group}>
      <div className={styles.groupHead}>
        <Select
          options={{ $and: 'AND', $or: 'OR' }}
          variant="primary"
          value={groupType}
          onChange={type => update(members, type as '$and' | '$or')}
          disabled={disabled}
        />
        {removable && (
          <ToolButton
            icon="material-close"
            title="Remove group"
            onClick={onRemove}
            disabled={disabled}
          />
        )}
      </div>
      <div className={styles.members}>
        {members.map((member, i) => (
          <ConditionNode
            key={i}
            keys={keys}
            value={member}
            onChange={m => handleMemberChange(i, m)}
            onRemove={() => update(members.filter((_, j) => j !== i))}
            removable={members.length > 1}
            disabled={disabled}
          />
        ))}
        <div>
          <ToolButton
            icon="material-add"
            title="Add condition"
            onClick={() => update([...members, newSingleNode(keys)])}
            disabled={disabled}
          />
          <ToolButton
            icon="material-folder_open"
            title="Add group"
            onClick={() => update([...members, { $or: [newSingleNode(keys)] }])}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};

const SingleCondition: FC<NodeProps<SingleNode>> = props => {
  const { keys, value, onChange, onRemove, removable, disabled } = props;
  const { keyName, op } = value;

  if (!(keyName in keys)) return <div>Error: Unknown key {keyName}</div>;

  const { type, spec } = keys[keyName];
  const { operators, control: Control } = typeMap[type];

  const handleKeyChange = (newKeyName: string) => {
    const newKey = keys[newKeyName];
    onChange({
      keyName: newKeyName,
      op: newKey.type === type ? op : '==',
      value: typeMap[newKey.type].convert(value.value, newKey.spec)
    });
  };

  const keyOptions: { [key: string]: string } = {};
  Object.keys(keys).forEach(k => (keyOptions[k] = keys[k].caption));

  return (
    <div className={styles.single}>
      <Select
        options={keyOptions}
        value={keyName}
        onChange={handleKeyChange}
        disabled={disabled}
      />
      <Select
        options={operators}
        value={op}
        onChange={op => onChange({ ...value, op: op as Operator })}
        disabled={disabled}
      />
      <div className={styles.value}>
        <Control
          spec={spec}
          value={value.value}
          onChange={v => onChange({ ...value, value: v })}
          disabled={disabled}
        />
      </div>
      {removable && (
        <ToolButton
          icon="material-close"
          title="Remove condition"
          onClick={onRemove}
          disabled={disabled}
        />
      )}
    </div>
  );
};

/**
 * Edits a nested AND/OR condition of keys and values.
 */
const ConditionEditor: FC<{
  keys: Keys;
  value: Condition;
  onChange: (value: Condition) => void;
  disabled?: boolean;
}> = props => {
  const { keys, value = { $and: [] }, onChange, disabled } = props;
  return (
    <div className={styles.editor}>
      <ConditionNode
        keys={keys}
        value={value}
        onChange={onChange as (node: Node) => void}
        onRemove={() => onChange({ $and: [] })}
        removable={false}
        disabled={disabled}
      />
    </div>
  );
};

export default ConditionEditor;

/**
 * Converts a condition to a MongoDB query for the API.
 * The values of `dateFields` are dates (`YYYY-MM-DD`) in the local time.
 */
export const conditionToMongoQuery = (
  condition: Node,
  dateFields: string[] = []
): object => {
  if ('$and' in condition) {
    return {
      $and: condition.$and.map(m => conditionToMongoQuery(m, dateFields))
    };
  }
  if ('$or' in condition) {
    return {
      $or: condition.$or.map(m => conditionToMongoQuery(m, dateFields))
    };
  }
  const { keyName: key, op, value } = condition;
  if (dateFields.includes(key)) {
    const start = { $date: normalizeRelative(value)!.toISOString() };
    const end = { $date: normalizeRelative(value, true)!.toISOString() };
    switch (op) {
      case '==':
        return { $and: [{ [key]: { $gte: start } }, { [key]: { $lt: end } }] };
      case '>':
        return { [key]: { $gte: end } };
      case '<':
        return { [key]: { $lt: start } };
      case '>=':
        return { [key]: { $gte: start } };
      case '<=':
        return { [key]: { $lt: end } };
      default:
        throw new Error('Invalid operator for date field');
    }
  }
  switch (op) {
    case '==':
      return { [key]: value };
    case '!=':
      return { [key]: { $ne: value } };
    case '>':
      return { [key]: { $gt: value } };
    case '<':
      return { [key]: { $lt: value } };
    case '>=':
      return { [key]: { $gte: value } };
    case '<=':
      return { [key]: { $lte: value } };
    case '^=':
      return { [key]: { $regex: '^' + escapeRegExp(value) } };
    case '$=':
      return { [key]: { $regex: escapeRegExp(value) + '$' } };
    case '*=':
      return { [key]: { $regex: escapeRegExp(value) } };
  }
};
