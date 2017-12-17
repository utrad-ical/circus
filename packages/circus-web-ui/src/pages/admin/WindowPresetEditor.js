import React from 'react';

/**
 * Renderes a 'window preset' editor with 'label', 'level' and 'width' fields.
 * Used in the "Project Administration" page.
 */
const WindowPresetEditor = props => {
	const { onChange, value: { label, level, width } } = props;

	function handleChange(ev) {
		if (typeof onChange !== 'function') return;
		const newValue = { label, level, width };
		let newItemValue = ev.target.value;
		if (/level|width/.test(ev.target.name)) newItemValue = parseFloat(newItemValue);
		newValue[ev.target.name] = newItemValue;
		onChange(newValue);
	}

	return <span className='window-preset-editor form-inline'>
		<input
			className='form-control'
			value={label}
			placeholder='label'
			name='label'
			onChange={handleChange}
		/>
		&nbsp;L:&nbsp;
		<input
			className='form-control'
			value={level}
			type='number'
			placeholder='window level'
			name='level'
			onChange={handleChange}
		/>
		&nbsp;W:&nbsp;
		<input
			className='form-control'
			value={width}
			type='number'
			placeholder='window width'
			name='width'
			onChange={handleChange}
		/>
	</span>;
};

export default WindowPresetEditor;