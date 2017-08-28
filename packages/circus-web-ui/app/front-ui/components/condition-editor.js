import React from 'react';
import { ShrinkSelect } from './shrink-select';
import { FormControl, FormGroup, Button, Glyphicon } from 'react-bootstrap';
import { escapeRegExp } from 'utils/util';

export const ConditionEditor = props => {
	return <div className="condition-editor">
		<ConditionNode keys={props.keys}
			depth={0}
			onChange={props.onChange} onRemove={() => {}}
			value={props.value} />
	</div>;
};

const ConditionNode = props => {
	if (typeof props.value === 'object') {
		const key = Object.keys(props.value)[0];
		const value = props.value[key];
		if (key === '$and' || key === '$or') {
			return <GroupedCondition keys={props.keys} index={props.index}
				onChange={props.onChange} onRemove={props.onRemove}
				depth={props.depth} groupType={key} members={value} />;
		} else {
			const { keyName, op, value } = props.value;
			return <SingleCondition keys={props.keys} index={props.index}
				memberCount={props.memberCount}
				onChange={props.onChange} onRemove={props.onRemove}
				depth={props.depth} keyName={keyName} op={op} value={value} />;
		}
	}
	return <p>Error</p>;
};

const GroupedCondition = props => {
	function memberChange(index, newObj) {
		let newMembers = props.members.slice();
		newMembers[index] = newObj;
		props.onChange({ [props.groupType]: newMembers });
	}

	function typeChange(type) {
		props.onChange({ [type]: props.members });
	}

	function deleteMember(index) {
		let newMembers = props.members.slice();
		newMembers.splice(index, 1);
		if (newMembers.length) {
			props.onChange({ [props.groupType]: newMembers });
		} else {
			props.onRemove(props.index);
		}
	}

	function addMemberClick() {
		let newMember = { keyName: Object.keys(props.keys)[0], op: '==', value: '' };
		props.onChange({ [props.groupType]: [...props.members, newMember] });
	}

	function addGroupClick() {
		let newCondition = { keyName: Object.keys(props.keys)[0], op: '==', value: '' };
		let newMember = { $or: [newCondition] };
		props.onChange({ [props.groupType]: [...props.members, newMember] });
	}

	return <div className="condition-group-node">
		<AndOr value={props.groupType} onChange={type => typeChange(type)} />
		{props.depth > 0 ?
			<ToolButton icon="remove" onClick={() => props.onRemove(props.index)} />
		: null}
		<div className="condition-group-members">
			{props.members.map((member, i) => (
				<ConditionNode keys={props.keys} index={i} depth={props.depth + 1}
					memberCount={props.members.length}
					onChange={val => memberChange(i, val)}
					onRemove={deleteMember}
					key={i} value={member} />
			))}
			<ToolButton icon="plus" onClick={addMemberClick} />
			<ToolButton icon="folder-open" onClick={addGroupClick} />
		</div>
	</div>;
}

const typeMap = {
	number: {
		operators: {
			'==': '=',
			'>': '>',
			'<': '<',
			'>=': '>=',
			'<=': '<='
		},
		control: props => <FormControl type='number' value={props.value}
			onChange={ev => props.onChange(parseFloat(ev.target.value))} />
	},
	text: {
		operators: {
			'==': 'is',
			'!=': 'is not',
			'^=': 'begins with',
			'$=': 'ends with',
			'*=': 'contains'
		},
		control: props => <FormControl type='text' value={props.value}
			onChange={ev => props.onChange(ev.target.value)} />
	},
	select: {
		operators: {
			'==': 'is',
			'!=': 'is not'
		},
		control: props => {
			let options = props.spec.options;
			if (Array.isArray(options)) {
				const tmp = {};
				options.forEach(item => tmp[item] = item);
				options = tmp;
			}
			return <FormControl componentClass='select'
			value={props.value} onChange={ev => props.onChange(ev.target.value)}>
				<option value="" hidden />
				{Object.keys(options).map(k =>
					<option value={k} key={k}>{options[k]}</option>
				)}
			</FormControl>
		}
	}
};

let SingleCondition = props => {
	const valueType = props.keys[props.keyName].type;
	const valueSpec = props.keys[props.keyName].spec;
	const operators = typeMap[valueType].operators;
	const Control = typeMap[valueType].control;

	function keyChange(newId) {
		let op = props.op;
		if (props.keys[props.keyName].type != props.keys[newId].type) op = '==';
		props.onChange({ keyName: newId, op, value: props.value });
	}

	function opChange(newOp) {
		props.onChange({ keyName: props.keyName, op: newOp, value: props.value });
	}

	function valueChange(newValue) {
		props.onChange({ keyName: props.keyName, op: props.op, value: newValue });
	}

	let options = {};
	Object.keys(props.keys).forEach(k => {
		options[k] = props.keys[k].caption;
	});

	return <div className="condition-single-node">
		<ShrinkSelect options={options} value={props.keyName} size="sm"
			onChange={id => keyChange(id)} />
		<ShrinkSelect options={operators} value={props.op} size="sm"
			onChange={op => opChange(op)} />
		<FormGroup bsSize="sm">
			{<Control value={props.value} onChange={valueChange} spec={valueSpec}/>}
		</FormGroup>
		{ props.memberCount > 1 ?
			<ToolButton icon="remove" onClick={() => props.onRemove(props.index)} />
		: null }
	</div>;
}

const AndOr = props => {
	let options = { $and: 'AND', $or: 'OR' };
	return <ShrinkSelect options={options} bsStyle="primary" size="sm"
		value={props.value} onChange={props.onChange} />;
};

const ToolButton = props => {
	return <Button bsSize="small" bsStyle="link" onClick={props.onClick}>
		<Glyphicon glyph={props.icon} />
	</Button>
};

export const conditionToMongoQuery = condition => {
	function binary2obj(key, op, value) {
		switch (op) {
			case '==':
				return {[key]: value};
			case '!=':
				return {[key]: {$ne: value}};
			case '>':
				return {[key]: {$gt: value}};
			case '<':
				return {[key]: {$lt: value}};
			case '>=':
				return {[key]: {$gte: value}};
			case '<=':
				return {[key]: {$lte: value}};
			case '^=':
				return {[key]: {$regex: '^' + escapeRegExp(value)}};
			case '$=':
				return {[key]: {$regex: escapeRegExp(value) + '$'}};
			case '*=':
				return {[key]: {$regex: escapeRegExp(value)}};
		}
	}

	if (Array.isArray(condition.$and)) {
		return { $and: condition.$and.map(m => conditionToMongoQuery(m))};
	} else if (Array.isArray(condition.$or)) {
		return { $or: condition.$or.map(m => conditionToMongoQuery(m))};
	} else if ('keyName' in condition) {
		return binary2obj(condition.keyName, condition.op, condition.value);
	}
};
