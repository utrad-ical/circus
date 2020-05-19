import React from 'react';
import classnames from 'classnames';
import styled from 'styled-components';

const StyledTable = styled.table.attrs(props => ({
  className: classnames('table table-hover table-condensed data-grid', {
    'data-grid-row-clickable': props.onItemClick
  })
}))`
  &.data-grid-row-clickable {
    tbody tr {
      cursor: pointer;
    }
  }
  .progress {
    margin: 0;
  }
`;

const normalizeColumn = c => {
  const ret = typeof c === 'string' ? { key: c, caption: c } : { ...c };
  const key = ret.key;
  if (!('className' in ret)) ret.className = key ? kebabCase(key) : undefined;
  return ret;
};

const kebabCase = str => {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
};

const DataGrid = props => {
  const { value, onItemClick, active } = props;
  const columns = props.columns.map(normalizeColumn);

  const handleItemClick = index => {
    onItemClick && onItemClick(index, value[index]);
  };

  return (
    <StyledTable>
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
          <tr
            key={i}
            className={classnames({ info: active === item })}
            onClick={() => handleItemClick(i)}
          >
            {columns.map(c => {
              const Renderer = c.renderer;
              return (
                <td key={c.className} className={c.className}>
                  {Renderer ? <Renderer value={item} index={i} /> : item[c.key]}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </StyledTable>
  );
};

export default DataGrid;
