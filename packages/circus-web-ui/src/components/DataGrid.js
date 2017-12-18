import React from 'react';
import classnames from 'classnames';

const normalizeColumn = c => {
	const ret = typeof c === 'string' ? { key: c, caption: c } : { ...c };
	const key = ret.key;
	if (!('className' in ret)) ret.className = kebabCase(key);
	return ret;
};

const kebabCase = str => {
	return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
};

const DataGrid = props => {
	const { value, className } = props;
	const columns = props.columns.map(normalizeColumn);
	return (
		<table className={classnames('table', 'data-grid', className)}>
			<thead>
				<tr>
					{columns.map(c => (
						<th key={c.className} className={c.className}>
							{c.caption}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{value.map((item, i) => (
					<tr key={i}>
						{columns.map((c, i) => {
							const Renderer = c.renderer;
							return (
								<td key={c.className} className={c.className}>
									{Renderer ? (
										<Renderer value={item} index={i} />
									) : (
										item[c.key]
									)}
								</td>
							);
						})}
					</tr>
				))}
			</tbody>
		</table>
	);
};

export default DataGrid;
