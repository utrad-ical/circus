import React from 'react';
import classnames from 'classnames';
import styled from 'styled-components';

const StyledTable = styled.table.attrs((props: any) => ({
  className: classnames('table table-hover table-condensed data-grid', {
    'data-grid-row-clickable': !!props.onItemClick
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

const normalizeColumn = <T extends {}>(
  c: string | DataGridColumnDefinition<T>
) => {
  const ret =
    typeof c === 'string'
      ? ({ key: c, caption: c } as DataGridColumnDefinition<T>)
      : { ...c };
  const key = ret.key as string;
  if (!('className' in ret)) ret.className = key ? kebabCase(key) : undefined;
  return ret as DataGridColumnDefinition<T>;
};

const kebabCase = (str: string) => {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
};

type DataGridRenderer<T> = React.FC<{
  value: T;
  index: number;
}>;

/**
 * Defined how to render a column of a DataGrid.
 * You have to set `key`, or `renderer`, or both.
 */
export interface DataGridColumnDefinition<T extends object = any> {
  key?: keyof T;
  caption?: string;
  className?: string;
  renderer?: DataGridRenderer<T>;
}

export interface DataGridProps<T extends object> {
  value: T[];
  onItemClick?: (index: number, item: T) => void;
  active?: T;
  columns: DataGridColumnDefinition<T>[];
}

const DataGrid: <T extends object>(
  props: DataGridProps<T>
) => React.ReactElement<any, any> = props => {
  const { value, onItemClick, active } = props;
  const columns = props.columns.map(normalizeColumn);

  const handleItemClick = (index: number) => {
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
                  {Renderer ? (
                    <Renderer value={item} index={i} />
                  ) : (
                    item[c.key!]
                  )}
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
