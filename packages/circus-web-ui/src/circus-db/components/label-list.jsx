import React from 'react';
import ColorPicker from 'rb/ColorPicker';

export const LabelList = props => {
	return <div className="label-list">
		<ul>
			{props.labels.map(label => <li><Label label="label"/></li>)}
		</ul>
	</div>;
};

const Label = props => {
	return <div>
		{props.label.caption}
		<ColorPicker value={props.label.color} />
	</div>
};
