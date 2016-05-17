import React from 'react';
import { ShrinkSelect } from './shrink-select.jsx';
import { FormControl, FormGroup, Button, Glyphicon } from 'react-bootstrap';

export let ConditionEditor = props => {
	return <div className="condition-editor">
		<ConditionNode keys={props.keys}
			depth={0}
			onChange={props.onChange} onRemove={() => {}}
			value={props.value} />
	</div>;
};

let ConditionNode = props => {
	if (typeof props.value === 'object') {
		let key = Object.keys(props.value)[0];
		let value = props.value[key];
		if (key === '$and' || key === '$or') {
			return <GroupedCondition keys={props.keys} index={props.index}
				onChange={props.onChange} onRemove={props.onRemove}
				depth={props.depth} groupType={key} members={value} />;
		} else {
			let keyOpValue = obj2binary(props.value);
			return <SingleCondition keys={props.keys} index={props.index}
				onChange={props.onChange} onRemove={props.onRemove}
				depth={props.depth} {...keyOpValue} />;
		}
	}
	return <p>Error</p>;
};

let GroupedCondition = props => {
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
		let newMember = { [Object.keys(props.keys)[0]]: '' };
		props.onChange({ [props.groupType]: [...props.members, newMember] });
	}

	function addGroupClick() {
		let newCondition = { [Object.keys(props.keys)[0]]: '' };
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
			onChange={ev => propx.onChange(ev.target.value)} />
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
		control: props =>
			<FormControl componentClass='select'
			value={props.value}	onChange={ev => props.onChange(ev.target.value)}>
				{Object.keys(props.spec.options).map(k =>
					<option value={k} key={k}>{props.spec.options[k]}</option>
				)}
			</FormControl>
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
		props.onChange(binary2obj(newId, op, props.value));
	}

	function opChange(newOp) {
		props.onChange(binary2obj(props.keyName, newOp, props.value));
	}

	function valueChange(newValue) {
		props.onChange(binary2obj(props.keyName, props.op, newValue));
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
		&ensp;
		<ToolButton icon="remove" onClick={() => props.onRemove(props.index)} />
	</div>;
}

let AndOr = props => {
	let options = { $and: 'AND', $or: 'OR' };
	return <ShrinkSelect options={options} bsStyle="primary"
		value={props.value} onChange={props.onChange} />;
};

let ToolButton = props => {
	return <Button bsSize="small" bsStyle="link" onClick={props.onClick}>
		<Glyphicon glyph={props.icon} />
	</Button>
}

function unescapeRegExp(str) {
	return str.replace(/\\([\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|])/g, '$1');
}

function escapeRegExp(str) {
	str = str + '';
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function obj2binary(obj) {
	let keyName = Object.keys(obj)[0];
	let value = obj[keyName];
	if (keyName === undefined) throw new Error('Invalid condition');
	if (value.$regex) {
		let match = value.$regex.match(/^(\^?)(.*?)(\$?)$/);
		if (match[1] === '^') {
			return {keyName, op: '^=', value: unescapeRegExp(match[2])};
		} else if (match[3] === '$') {
			return {keyName, op: '$=', value: unescapeRegExp(match[2])};
		} else {
			return {keyName, op: '*=', value: unescapeRegExp(match[2])};
		}
	} else if (typeof value === 'string' || typeof value === 'number') {
		return {keyName, value, op: '=='};
	} else if ('$ne' in value) {
		return {keyName, value: value.$ne, op: '!='};
	} else if ('$gt' in value) {
		return {keyName, value: value.$gt, op: '>'};
	} else if ('$lt' in value) {
		return {keyName, value: value.$lt, op: '<'};
	} else if ('$ge' in value) {
		return {keyName, value: value.$ge, op: '>='};
	} else if ('$le' in value) {
		return {keyName, value: value.$le, op: '<='};
	}
	throw new Error('Invalid object');
}

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
			return {[key]: {$ge: value}};
		case '<=':
			return {[key]: {$le: value}};
		case '^=':
			return {[key]: {$regex: '^' + escapeRegExp(value)}};
		case '$=':
			return {[key]: {$regex: escapeRegExp(value) + '$'}};
		case '*=':
			return {[key]: {$regex: escapeRegExp(value)}};
	}
}
