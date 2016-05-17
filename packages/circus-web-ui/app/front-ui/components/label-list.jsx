import React form 'react';
import { ColorPicker } from './color-picker.jsx';

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
