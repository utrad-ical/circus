import React, { useEffect, useRef } from 'react';
import classnames from 'classnames';
import styled from 'styled-components';

const StyledTable = styled.table.attrs((props: any) => ({
  className: classnames('table table-hover table-condensed data-grid', {
    'data-grid-row-clickable': !!props.onItemClick
  })
}))`
  tbody tr td {
    vertical-align: middle;
  }
  tbody > tr:last-of-type > td {
    border-bottom-style: solid;
    border-bottom-width: 2px;
  }
  &.data-grid-row-clickable {
    tbody tr {
      cursor: pointer;
    }
  }
  .operation {
    text-align: right;
  }
  .progress {
    margin: 0;
  }
  .feedback-none {
    color: silver;
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

export type DataGridRenderer<T> = React.FC<{
  value: T;
  index: number;
}>;

/**
 * Defined how to render a column of a DataGrid.
 * You have to set `key`, or `renderer`, or both.
 */
export interface DataGridColumnDefinition<T extends {} = any> {
  key?: string;
  caption?: string;
  className?: string;
  renderer?: DataGridRenderer<T>;
}

export interface DataGridProps<T extends {}> {
  value: T[];
  onItemClick?: (index: number, item: T) => void;
  active?: T;
  columns: DataGridColumnDefinition<T>[];
  itemPrimaryKey?: keyof T;
  itemSelectable?: boolean;
  selectedItems?: string[];
  onSelectionChange?: (id: string, isSelected: boolean) => void;
  className?: string;
}

const DataGrid: <T extends {}>(
  props: DataGridProps<T>
) => React.ReactElement<any, any> = props => {
  const {
    value,
    onItemClick,
    active,
    className,
    itemPrimaryKey,
    itemSelectable,
    selectedItems,
    onSelectionChange
  } = props;
  const columns = props.columns.map(normalizeColumn);
  if (itemSelectable && !itemPrimaryKey)
    throw new Error('itemPrimaryKey not set');

  const handleItemClick = (index: number) => {
    onItemClick && onItemClick(index, value[index]);
  };

  const handleSelectAllChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const checked = ev.target.checked;
    value
      .map(item => (item[itemPrimaryKey!] as any) as string)
      .forEach(id => onSelectionChange?.(id, checked));
  };

  const allCheckStatus =
    !itemSelectable || !selectedItems
      ? undefined
      : (() => {
          const allIds = value.map(
            item => (item[itemPrimaryKey!] as any) as string
          );
          const selected = allIds.filter(id => selectedItems.indexOf(id) >= 0);
          if (selected.length === 0) return false;
          if (selected.length === allIds.length) return true;
          return 'indeterminate';
        })();

  const allCheckRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // `indeterminate` cannot be set via HTML attributes
    if (!allCheckRef.current) return;
    allCheckRef.current.indeterminate = allCheckStatus === 'indeterminate';
  }, [allCheckStatus]);

  return (
    <StyledTable className={className}>
      <thead>
        <tr>
          {itemSelectable && (
            <th>
              <input
                ref={allCheckRef}
                type="checkbox"
                checked={allCheckStatus === true}
                onChange={handleSelectAllChange}
              />
            </th>
          )}
          {columns.map(c => (
            <th key={c.className} className={c.className}>
              {c.caption}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {value.map((item, i) => {
          const key = itemPrimaryKey
            ? ((item[itemPrimaryKey] as any) as string)
            : String(i);
          return (
            <tr
              key={key}
              className={classnames({ info: active === item })}
              onClick={() => handleItemClick(i)}
            >
              {itemSelectable && itemPrimaryKey && (
                <td>
                  <input
                    type="checkbox"
                    checked={selectedItems!.indexOf(key) >= 0}
                    onChange={ev => {
                      ev.stopPropagation();
                      onSelectionChange!(key, ev.target.checked);
                    }}
                  />
                </td>
              )}
              {columns.map(c => {
                const Renderer = c.renderer;
                return (
                  <td key={c.className} className={c.className}>
                    {Renderer ? (
                      <Renderer value={item} index={i} />
                    ) : (
                      (item as any)[c.key!]
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </StyledTable>
  );
};

export default DataGrid;
