import React from 'react';
import classnames from 'classnames';

const normalizeColumn = c => {
	const ret = typeof c === 'string' ? { key: c, caption: c } : c;
	if (!('className' in ret)) ret.className = kebabCase(ret.key);
	if (!('renderer' in ret)) ret.renderer = (v => v);
	return ret;
};

const kebabCase = str => {
	return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
};

const DataGrid = props => {
	const { value, className } = props;
	const columns = props.columns.map(normalizeColumn);
	return <table className={classnames('table', className)}>
		<thead>
			{columns.map((c, i) => <th key={i} className={c.className}>
				{c.caption}
			</th>)}
		</thead>
		<tbody>
			{value.map((item, i) => <tr key={i}>
				{columns.map((c, i) => <td key={i} className={c.className}>
					{c.renderer(item[c.key], i, item)}
				</td>)}
			</tr>)}
		</tbody>
	</table>;
};

export default DataGrid;