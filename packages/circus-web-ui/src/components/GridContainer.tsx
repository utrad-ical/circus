import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import produce from 'immer';

export const defaultDragDataMimeType = 'text/grid-container-drop';

export interface PositionInfo {
  [key: string]: number;
}

/**
 * Describes the layout of this container.
 * Use `layoutReducer` to modify this object whenever possible.
 */
export interface LayoutInfo {
  /**
   * The number of columns of the container (>= 1).
   */
  columns: number;
  /**
   * The number of rows of the container (>= 1).
   */
  rows: number;
  /**
   * Holds the 0-based position of each item.
   * The top-left cell is `0`, the bottom-right cell is `(columns * rows) - 1`.
   */
  positions: PositionInfo;
}

interface LayoutActionPayload {
  insertItemAt: { key: string; x: number; y: number };
  insertItemToEmptyCell: { key: string };
  removeItem: { key: string };
  moveItem: { toIndex: number; fromKey: string };
  insertColumn: { index: number };
  insertRow: { index: number };
  removeColumn: { index: number };
  removeRow: { index: number };
  pruneEmptyColumns: null;
  pruneEmptyRows: null;
  pruneEmptyTracks: null;
  rearrange: { columns: number; rows: number };
}

export type LayoutAction = {
  [T in keyof LayoutActionPayload]: LayoutActionPayload[T] extends null
    ? { type: T }
    : { type: T; payload: LayoutActionPayload[T] };
}[keyof LayoutActionPayload];

/**
 * Use this reducer to create a new layout from the previous layout.
 * @param layout The current layout object (immutable).
 * @param action The action used to modify this layout object.
 */
export const layoutReducer = produce(
  (layout: LayoutInfo, action: LayoutAction): LayoutInfo | undefined => {
    const isEmpty = (x: number, y: number) =>
      Object.values(layout.positions).indexOf(x + y * layout.columns) < 0;

    switch (action.type) {
      case 'insertItemAt': {
        const { key, x, y } = action.payload;
        if (key in layout.positions)
          throw new Error('This item is already in the layout.');
        if (x < 0 || x >= layout.columns || y < 0 || y >= layout.rows)
          throw new Error('Invalid coordinte');
        const position = x + y * layout.columns;
        layout.positions[key] = position;
        break;
      }
      case 'insertItemToEmptyCell': {
        const { key } = action.payload;
        if (key in layout.positions)
          throw new Error('This item is already in the layout.');
        for (let p = 0; p < layout.columns * layout.rows; p++) {
          if (Object.values(layout.positions).indexOf(p) < 0) {
            // Insert into this empty cell
            layout.positions[key] = p;
            return;
          }
        }
        // Insert into a new row
        layout.positions[key] = layout.columns * layout.rows;
        layout.rows++;
        break;
      }
      case 'removeItem': {
        const { key } = action.payload;
        delete layout.positions[key];
        break;
      }
      case 'moveItem': {
        const { toIndex, fromKey } = action.payload;
        const positions = { ...layout.positions };
        const destKey = Object.keys(layout.positions).find(
          k => layout.positions[k] === toIndex
        );
        positions[fromKey] = toIndex;
        if (destKey) {
          // there is already something at the destination
          if (fromKey in layout.positions) {
            // swap
            positions[destKey] = layout.positions[fromKey];
          } else {
            // overwrite
            delete positions[destKey];
          }
        }
        layout.positions = positions;
        break;
      }
      case 'insertColumn': {
        const { index } = action.payload; // 1-based: see CSS Grid spec
        if (index < 1 || index > layout.columns + 1)
          throw new Error('Invalid line index');
        const positions: PositionInfo = {};
        Object.entries(layout.positions).forEach(([key, i]) => {
          const x = i % layout.columns;
          const y = Math.floor(i / layout.columns);
          const newX = x >= index - 1 ? x + 1 : x;
          positions[key] = newX + y * (layout.columns + 1);
        });
        layout.columns += 1;
        layout.positions = positions;
        break;
      }
      case 'insertRow': {
        const { index } = action.payload; // 1-based: see CSS Grid spec
        if (index < 1 || index > layout.rows + 1)
          throw new Error('Invalid line index');
        const positions: PositionInfo = {};
        Object.entries(layout.positions).forEach(([key, i]) => {
          const x = i % layout.columns;
          const y = Math.floor(i / layout.columns);
          const newY = y >= index - 1 ? y + 1 : y;
          positions[key] = x + newY * layout.columns;
        });
        layout.rows += 1;
        layout.positions = positions;
        break;
      }
      case 'removeColumn': {
        const { index } = action.payload; // 0-based
        if (index < 0 || index > layout.columns - 1)
          throw new Error('Invalid line index');
        if (layout.columns <= 1) throw new Error('Cannot remove last column');
        const positions: PositionInfo = {};
        Object.entries(layout.positions).forEach(([key, i]) => {
          const x = i % layout.columns;
          const y = Math.floor(i / layout.columns);
          if (x === index) throw new Error('Column not empty');
          const newX = x > index ? x - 1 : x;
          positions[key] = newX + y * (layout.columns - 1);
        });
        layout.columns -= 1;
        layout.positions = positions;
        break;
      }
      case 'removeRow': {
        const { index } = action.payload; // 0-based
        if (index < 0 || index > layout.rows - 1)
          throw new Error('Invalid line index');
        if (layout.rows <= 1) throw new Error('Cannot remove last row');
        const positions: PositionInfo = {};
        Object.entries(layout.positions).forEach(([key, i]) => {
          const x = i % layout.columns;
          const y = Math.floor(i / layout.columns);
          if (y === index) throw new Error('Row not empty');
          const newY = y > index ? y - 1 : y;
          positions[key] = x + newY * layout.columns;
        });
        layout.rows -= 1;
        layout.positions = positions;
        break;
      }
      case 'pruneEmptyColumns': {
        if (layout.columns <= 1) return layout;
        let current = layout;
        for (let x = layout.columns - 1; x >= 0; x--) {
          if (range(0, layout.rows - 1).every(y => isEmpty(x, y))) {
            current = layoutReducer(current, {
              type: 'removeColumn',
              payload: { index: x }
            });
            if (current.columns <= 1) break;
          }
        }
        return current;
      }
      case 'pruneEmptyRows': {
        if (layout.rows <= 1) return layout;
        let current = layout;
        for (let y = layout.rows - 1; y >= 0; y--) {
          if (range(0, layout.columns - 1).every(x => isEmpty(x, y))) {
            current = layoutReducer(current, {
              type: 'removeRow',
              payload: { index: y }
            });
          }
          if (current.rows <= 1) break;
        }
        return current;
      }
      case 'pruneEmptyTracks': {
        const actions: LayoutAction[] = [
          { type: 'pruneEmptyColumns' },
          { type: 'pruneEmptyRows' }
        ];
        return actions.reduce(layoutReducer, layout);
      }
      case 'rearrange': {
        // Arranges all visible items from the top-left corner.
        // If there are not enough cells, remaining items will be ignored.
        const { columns, rows } = action.payload;
        const entries = Object.entries(layout.positions)
          .slice()
          .sort((a, b) => a[1] - b[1]);
        const positions: PositionInfo = {};
        let counter = 0;
        entries.slice(0, columns * rows).forEach(([key]) => {
          positions[key] = counter++;
        });
        return { columns, rows, positions };
      }
    }
  }
);

///////////////////////////////////////////////////////////////////////////////

interface Props<T extends { key: string }> {
  /**
   * Entire list of the items that can be rendered.
   * Each item must be an object that at least has a `key` property.
   * You must also set the `layout` prop accordingly.
   * An item whose position is not specified in `layout` will NOT be displayed.
   */
  items: T[];
  /**
   * The layout object. Use this to change the number of columns/rows,
   * or change the visibility and position of each item.
   */
  layout: LayoutInfo;
  /**
   * Component to render the draggable header.
   * One of the items in `items` will be passed to this component.
   */
  renderHeader: React.ComponentType<{ value: T }>;
  /**
   * Component to render the content.
   * One of the items in `items` will be passed to this component.
   * This will automatically fit to the grid size.
   * Consider memoizing this component using `React.memo`, etc.
   */
  renderItem: React.ComponentType<{ value: T }>;
  /**
   * Triggered when a layout change happens on mouse drag.
   */
  onLayoutChange: (layout: LayoutInfo) => void;
  /**
   * The width of the gutter (px).
   */
  gutterWidth?: number;
  /**
   * The mime type of the drag data to respond.
   * Drag data of this type can be dropped from outside this component.
   * The drag data must contain a string key.
   */
  dragDataMimeType?: string;
  /**
   * If true, enables dragging out of the container to remove the item.
   */
  dragRemovable?: boolean;
  className?: string;
}

type DropDestination =
  | { type: 'cell'; position: number }
  | { type: 'column'; colLineIndex: number; row: number }
  | { type: 'row'; rowLineIndex: number; column: number }
  | { type: 'remove' };

/**
 * Grid-based container.
 */
const GridContainer = <T extends { key: string }>(
  props: Props<T>
): React.ReactElement => {
  const {
    items,
    layout,
    renderHeader: RenderHeading,
    renderItem: RenderItem,
    onLayoutChange,
    gutterWidth = 30,
    dragDataMimeType = defaultDragDataMimeType,
    dragRemovable = false,
    className
  } = props;

  const [
    dropDestination,
    setDropDestination
  ] = useState<DropDestination | null>(null);
  const [fromKey, setFromKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (
    key: string,
    ev: React.DragEvent<HTMLDivElement>
  ) => {
    ev.dataTransfer.setData(dragDataMimeType, key);
    ev.dataTransfer.dropEffect = 'move';
    setFromKey(key);
  };

  const gridPositionToCss = (position: number) => {
    return {
      gridColumn: `${(position % layout.columns) + 1}/span 1`,
      gridRow: `${Math.floor(position / layout.columns) + 1}/span 1`
    };
  };

  const gridLineToCss = (dropIndicator: DropDestination) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const cellWidth = rect.width / layout.columns;
    const cellHeight = rect.height / layout.rows;
    if (dropIndicator.type === 'column') {
      return {
        display: 'block',
        left: `${
          cellWidth * (dropIndicator.colLineIndex - 1) - gutterWidth / 2
        }px`,
        width: `${gutterWidth}px`,
        top: 0,
        bottom: 0
      };
    } else if (dropIndicator.type === 'row') {
      return {
        display: 'block',
        top: `${
          cellHeight * (dropIndicator.rowLineIndex - 1) - gutterWidth / 2
        }px`,
        height: `${gutterWidth}px`,
        left: 0,
        right: 0
      };
    } else throw new Error('Invalid drop indicator value');
  };

  const mousePosToGridPos = (clientX: number, clientY: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = Math.floor((clientX - rect.x) / (rect.width / layout.columns));
    const y = Math.floor((clientY - rect.y) / (rect.height / layout.rows));
    return x + y * layout.columns;
  };

  const handleDragOver = (ev: React.DragEvent<HTMLDivElement>) => {
    if (!ev.dataTransfer.types.includes(dragDataMimeType)) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';

    const rect = containerRef.current!.getBoundingClientRect();
    const cellWidth = rect.width / layout.columns;
    const cellHeight = rect.height / layout.rows;
    for (let col = 1; col <= layout.columns + 1; col++) {
      if (cellWidth < 30) break;
      if (
        Math.abs(ev.clientX - rect.x - (col - 1) * cellWidth) <
        gutterWidth / 2
      ) {
        const row = Math.floor((ev.clientY - rect.y) / cellHeight); // 0-based
        if (
          !dropDestination ||
          dropDestination.type !== 'column' ||
          dropDestination.colLineIndex !== col ||
          dropDestination.row !== row
        ) {
          setDropDestination({ type: 'column', colLineIndex: col, row });
        }
        return;
      }
    }
    for (let row = 1; row <= layout.rows + 1; row++) {
      if (cellHeight < 30) break;
      if (
        Math.abs(ev.clientY - rect.y - (row - 1) * cellHeight) <
        gutterWidth / 2
      ) {
        const column = Math.floor((ev.clientX - rect.x) / cellWidth); // 0-based
        if (
          !dropDestination ||
          dropDestination.type !== 'row' ||
          dropDestination.rowLineIndex !== row ||
          dropDestination.column !== column
        ) {
          setDropDestination({ type: 'row', rowLineIndex: row, column });
        }
        return;
      }
    }
    const position = mousePosToGridPos(ev.clientX, ev.clientY);
    if (
      !dropDestination ||
      dropDestination.type !== 'cell' ||
      dropDestination.position !== position
    ) {
      setDropDestination({ type: 'cell', position });
    }
  };

  const handleDrop = (ev: React.DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    if (!dropDestination) return;
    const fromKey = ev.dataTransfer.getData(dragDataMimeType);
    switch (dropDestination.type) {
      case 'cell': {
        const toIndex = mousePosToGridPos(ev.clientX, ev.clientY);
        const actions: LayoutAction[] = [
          { type: 'moveItem', payload: { fromKey, toIndex } },
          { type: 'pruneEmptyTracks' }
        ];
        onLayoutChange(actions.reduce(layoutReducer, layout));
        break;
      }
      case 'column': {
        const actions: LayoutAction[] = [
          {
            type: 'insertColumn',
            payload: { index: dropDestination.colLineIndex }
          },
          {
            type: 'moveItem',
            payload: {
              fromKey,
              toIndex:
                dropDestination.colLineIndex -
                1 +
                (layout.columns + 1) * dropDestination.row
            }
          },
          { type: 'pruneEmptyTracks' }
        ];
        onLayoutChange(actions.reduce(layoutReducer, layout));
        break;
      }
      case 'row': {
        const actions: LayoutAction[] = [
          {
            type: 'insertRow',
            payload: { index: dropDestination.rowLineIndex }
          },
          {
            type: 'moveItem',
            payload: {
              fromKey,
              toIndex:
                dropDestination.column +
                layout.columns * (dropDestination.rowLineIndex - 1)
            }
          },
          { type: 'pruneEmptyTracks' }
        ];
        onLayoutChange(actions.reduce(layoutReducer, layout));
        break;
      }
    }
    setDropDestination(null);
  };

  const handleDragLeave = (ev: React.DragEvent) => {
    if (ev.target !== containerRef.current) return;
    setDropDestination(dragRemovable ? { type: 'remove' } : null);
  };

  const handleDragEnd = (ev: React.DragEvent) => {
    if (dragRemovable && dropDestination?.type === 'remove') {
      const actions: LayoutAction[] = [
        { type: 'removeItem', payload: { key: fromKey! } },
        { type: 'pruneEmptyTracks' }
      ];
      onLayoutChange(actions.reduce(layoutReducer, layout));
    }
    setDropDestination(null);
    setFromKey(null);
  };

  return (
    <StyledDiv
      ref={containerRef}
      layout={layout}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      onDragEnd={handleDragEnd}
      className={className}
    >
      {Object.keys(layout.positions).map(key => {
        const item = items.find(item => item.key === key);
        if (!item) throw new Error('No such grid item: ' + key);
        return (
          <div
            className="grid-container-cell"
            key={key}
            style={
              key in layout.positions
                ? { ...gridPositionToCss(layout.positions[key]) }
                : {}
            }
          >
            <div
              className="grid-container-header"
              draggable
              onDragStart={ev => handleDragStart(key, ev)}
            >
              <RenderHeading value={item} />
            </div>
            <div className="grid-container-item">
              <RenderItem value={item} />
            </div>
          </div>
        );
      })}
      <div
        className="grid-container-cell-drop-indicator"
        style={
          dropDestination?.type === 'cell'
            ? {
                display: 'block',
                ...gridPositionToCss(dropDestination.position)
              }
            : {}
        }
      />
      <div
        className="grid-container-line-drop-indicator"
        style={
          dropDestination?.type === 'column' || dropDestination?.type === 'row'
            ? gridLineToCss(dropDestination)
            : {}
        }
      />
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  border: 1px solid black;
  display: grid;
  position: relative;
  width: 100%;
  height: 100%;
  grid-template-columns: ${(props: any) =>
    `repeat(${props.layout.columns}, ${100 / props.layout.columns}%)`};
  grid-template-rows: ${(props: any) =>
    `repeat(${props.layout.rows}, ${100 / props.layout.rows}%)`};
  overflow: hidden;

  .grid-container-cell {
    display: grid;
    grid-template-rows: auto 1fr;
    overflow: hidden;
  }

  .grid-container-item {
    display: contents;
  }

  .grid-container-cell-drop-indicator {
    pointer-events: none;
    display: none;
    position: absolute;
    background: #88888888;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
  }

  .grid-container-line-drop-indicator {
    pointer-events: none;
    display: none;
    position: absolute;
    background: #8888ff88;
  }
`;

export default GridContainer;

const range = (from: number, to: number) => {
  const result = [];
  for (let i = from; i <= to; i++) result.push(i);
  return result;
};
