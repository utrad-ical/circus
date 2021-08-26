import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import { InterpolationMode } from '@utrad-ical/circus-rs/src/browser/ViewState';
import Icon from 'components/Icon';
import {
  Button,
  Dropdown,
  MenuItem,
  OverlayTrigger,
  Tooltip,
  SplitButton
} from 'components/react-bootstrap';
import React from 'react';
import styled from 'styled-components';
import { WindowPreset } from 'types/Project';
import useKeyboardShortcut from 'utils/useKeyboardShortcut';
import { ToolOptions, ToolOptionSetter } from 'pages/case-detail/useToolbar';
import { ReferenceValueOption } from '@utrad-ical/circus-rs/src/browser/tool/cloud/WandTool';
import ModifierKeyBehaviors from '@utrad-ical/circus-rs/src/browser/annotation/ModifierKeyBehaviors';
import { Editor } from '@smikitky/rb-components/lib/editor-types';
import { LayoutKind } from './caseStore';
import { MenuItemProps } from 'react-bootstrap';
import PlaneFigureOption from '@utrad-ical/circus-rs/src/browser/annotation/PlaneFigureOption';

export interface ViewOptions {
  showReferenceLine?: boolean;
  scrollbar?: ScrollbarOptions;
  interpolationMode?: InterpolationMode;
}

type ScrollbarOptions = 'none' | 'large' | 'small';

const scrollbarOptions: { key: ScrollbarOptions; caption: string }[] = [
  { key: 'none', caption: 'None' },
  { key: 'small', caption: 'Small' },
  { key: 'large', caption: 'Large' }
];

type ZDimmedThresholdOptions = 'hide' | 'show' | 'infinity';

export const zDimmedThresholdOptions: {
  key: ZDimmedThresholdOptions;
  caption: string;
  value: number;
}[] = [
  { key: 'hide', caption: 'None', value: 0 },
  { key: 'show', caption: '± 2', value: 3 },
  { key: 'infinity', caption: '∞', value: Infinity }
];

const layoutOptions: {
  key: LayoutKind;
  caption: string;
  icon: string;
  shortcut: string;
}[] = [
  {
    key: 'twoByTwo',
    caption: '2 x 2',
    icon: 'circus-layout-four',
    shortcut: 'X'
  },
  {
    key: 'axial',
    caption: 'Axial',
    icon: 'circus-orientation-axial',
    shortcut: 'A'
  },
  {
    key: 'sagittal',
    caption: 'Sagittal',
    icon: 'circus-orientation-sagittal',
    shortcut: 'S'
  },
  {
    key: 'coronal',
    caption: 'Coronal',
    icon: 'circus-orientation-coronal',
    shortcut: 'C'
  }
];

const ToolBar: React.FC<{
  active: string;
  toolOptions: ToolOptions;
  setToolOption: ToolOptionSetter;
  viewOptions: ViewOptions;
  onChangeViewOptions: (viewOptions: ViewOptions) => void;
  onChangeLayoutKind: (kind: LayoutKind) => void;
  modifierKeyBehaviors: ModifierKeyBehaviors;
  onChangeModifierKeyBehaviors: (
    modifierKeyBehaviors: ModifierKeyBehaviors
  ) => void;
  planeFigureOption: PlaneFigureOption;
  onChangePlaneFigureOption: (planeFigureOption: PlaneFigureOption) => void;
  brushEnabled: boolean;
  wandEnabled: boolean;
  windowPresets?: WindowPreset[];
  onChangeTool: (toolName: string) => void;
  onApplyWindow: (window: any) => void;
  onMagnify: (magnitude: number) => void;
  disabled?: boolean;
}> = React.memo(props => {
  const {
    active,
    toolOptions,
    setToolOption,
    viewOptions,
    onChangeViewOptions,
    onChangeLayoutKind,
    modifierKeyBehaviors,
    onChangeModifierKeyBehaviors,
    planeFigureOption,
    onChangePlaneFigureOption,
    brushEnabled,
    wandEnabled,
    windowPresets = [],
    onChangeTool,
    onApplyWindow,
    onMagnify,
    disabled
  } = props;

  const widthOptions = ['1', '3', '5', '7'];
  const wandModeOptions = { '3d': '3D', '2d': '2D' };

  const instantZoomLevels: {
    label: string;
    level: number;
    shortcut?: string;
  }[] = [
    { label: 'x8', level: 8 },
    { label: 'x4', level: 4 },
    { label: 'x2', level: 2, shortcut: '+' },
    { label: 'x1/2', level: 0.5, shortcut: '-' },
    { label: 'x1/4', level: 0.25 },
    { label: 'x1/8', level: 0.125 }
  ];

  const handleToggleReferenceLine = () => {
    onChangeViewOptions({
      ...viewOptions,
      showReferenceLine: !viewOptions.showReferenceLine
    });
  };
  useKeyboardShortcut(';', handleToggleReferenceLine);

  const handleToggleLockMaintainAspectRatio = () => {
    onChangeModifierKeyBehaviors({
      ...modifierKeyBehaviors,
      lockMaintainAspectRatio: !modifierKeyBehaviors.lockMaintainAspectRatio
    });
  };

  const handleChangeZDimmedThreshold = (selection: any) => {
    onChangePlaneFigureOption({
      ...planeFigureOption,
      zDimmedThreshold: zDimmedThresholdOptions.find(
        zDimmedThresholdOption => zDimmedThresholdOption.key === selection
      )!.value
    });
  };

  const handleToggleLockFixCenterOfGravity = () => {
    onChangeModifierKeyBehaviors({
      ...modifierKeyBehaviors,
      lockFixCenterOfGravity: !modifierKeyBehaviors.lockFixCenterOfGravity
    });
  };

  const handleToggleScrollbar = (selection: any) => {
    onChangeViewOptions({
      ...viewOptions,
      scrollbar: selection as ScrollbarOptions
    });
  };

  const handleToggleInterpolationMode = () => {
    onChangeViewOptions({
      ...viewOptions,
      interpolationMode:
        viewOptions.interpolationMode === 'trilinear'
          ? 'nearestNeighbor'
          : 'trilinear'
    });
  };

  const handleApplyWindow = async (selection: any) => {
    if ('level' in selection && 'width' in selection) {
      const window = selection as WindowPreset;
      onApplyWindow({ level: window.level, width: window.width });
    } else {
      const value = await prompt('Input window level/width (e.g., "20,100")');
      const [level, width] = (value ? value : '0,0')
        .split(/,|\//)
        .map(s => parseInt(s, 10));
      if (width <= 0 || isNaN(level) || isNaN(width)) return;
      onApplyWindow({ level, width });
    }
  };

  return (
    <StyledDiv>
      <ToolButton
        name="pager"
        icon="rs-pager"
        changeTool={onChangeTool}
        active={active}
        shortcut="P"
        disabled={disabled}
      />
      <ToolButton
        name="zoom"
        icon="rs-zoom"
        changeTool={onChangeTool}
        active={active}
        shortcut="Z"
        disabled={disabled}
      >
        {instantZoomLevels.map(({ label, level, shortcut }) => (
          <MenuItemWithShortcut
            key={label}
            onClick={() => onMagnify(level)}
            shortcut={shortcut}
          >
            {label}
          </MenuItemWithShortcut>
        ))}
      </ToolButton>
      <ToolButton
        name="hand"
        icon="rs-hand"
        changeTool={onChangeTool}
        active={active}
        shortcut="H"
        disabled={disabled}
      />
      <ToolButton
        name="window"
        icon="rs-window"
        changeTool={onChangeTool}
        active={active}
        shortcut="W"
        disabled={disabled}
      >
        {windowPresets.map((p: WindowPreset, i) => (
          <MenuItem
            key={i + 1}
            eventKey={i + 1}
            onClick={() => handleApplyWindow(p)}
          >
            <b>{p.label}</b> {`(L: ${p.level} / W: ${p.width})`}
          </MenuItem>
        ))}
        <MenuItem key={99999} eventKey={99999} onClick={handleApplyWindow}>
          Manual
        </MenuItem>
      </ToolButton>
      &thinsp;
      <ToolButton
        name="brush"
        icon="rs-brush"
        changeTool={onChangeTool}
        active={active}
        shortcut="B"
        disabled={!brushEnabled || disabled}
      />
      <ToolButton
        name="eraser"
        icon="rs-eraser"
        changeTool={onChangeTool}
        active={active}
        shortcut="E"
        disabled={!brushEnabled || disabled}
      />
      <ShrinkSelect
        numericalValue
        className="line-width-shrinkselect"
        options={widthOptions}
        value={toolOptions.lineWidth}
        onChange={lineWidth => setToolOption('lineWidth', lineWidth)}
        disabled={!brushEnabled || disabled}
      />
      <ToolButton
        name="bucket"
        icon="rs-bucket"
        changeTool={onChangeTool}
        active={active}
        shortcut="Shift+B"
        disabled={!brushEnabled || disabled}
      />
      <ToolButton
        name="bucketEraser"
        icon="rs-bucket-erase"
        changeTool={onChangeTool}
        active={active}
        shortcut="Shift+E"
        disabled={!brushEnabled || disabled}
      />
      <ToolButton
        name="wand"
        icon="rs-wand"
        changeTool={onChangeTool}
        active={active}
        shortcut="M"
        disabled={!brushEnabled || !wandEnabled || disabled}
      />
      <ToolButton
        name="wandEraser"
        icon="rs-wand-eraser"
        changeTool={onChangeTool}
        active={active}
        shortcut="Shift+M"
        disabled={!brushEnabled || !wandEnabled || disabled}
      />
      &thinsp;
      <Dropdown id="layout-dropdown" disabled={disabled}>
        <Dropdown.Toggle>
          <Icon icon="circus-layout-four" />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {layoutOptions.map(l => {
            return (
              <MenuItemWithShortcut
                key={l.key}
                eventKey={l.key}
                shortcut={l.shortcut}
                onClick={() => onChangeLayoutKind(l.key)}
              >
                <Icon icon={l.icon} />
                {l.caption}
              </MenuItemWithShortcut>
            );
          })}
        </Dropdown.Menu>
      </Dropdown>
      &thinsp;
      <Dropdown id="view-options-dropdown" disabled={disabled}>
        <Dropdown.Toggle>
          <Icon icon="circus-tool" />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <MenuItemWithShortcut
            shortcut=";"
            onClick={handleToggleReferenceLine}
          >
            <CheckMark checked={!!viewOptions.showReferenceLine} />
            Show reference line
          </MenuItemWithShortcut>
          <MenuItemWithShortcut
            shortcut="F"
            onClick={handleToggleInterpolationMode}
          >
            <CheckMark
              checked={viewOptions.interpolationMode === 'trilinear'}
            />
            Trilinear filtering
          </MenuItemWithShortcut>
          <MenuItem divider />
          <MenuItem header>Scroll bars</MenuItem>
          {scrollbarOptions.map(l => {
            return (
              <MenuItem
                key={l.key}
                eventKey={l.key}
                onSelect={handleToggleScrollbar}
              >
                <CheckMark checked={viewOptions.scrollbar === l.key} />
                {l.caption}
              </MenuItem>
            );
          })}
          <MenuItem divider />
          <MenuItem header>Shape resizing behavior</MenuItem>
          <MenuItem onClick={handleToggleLockMaintainAspectRatio}>
            <CheckMark checked={modifierKeyBehaviors.lockMaintainAspectRatio} />
            Lock Shift + Drag to maintain aspect ratio
          </MenuItem>
          <MenuItem onClick={handleToggleLockFixCenterOfGravity}>
            <CheckMark checked={modifierKeyBehaviors.lockFixCenterOfGravity} />
            Lock Ctrl + Drag to fix center of gravity
          </MenuItem>
          <MenuItem header>Number of slices for 2D shape</MenuItem>
          {zDimmedThresholdOptions.map(l => {
            return (
              <MenuItem
                key={l.key}
                eventKey={l.key}
                onSelect={handleChangeZDimmedThreshold}
              >
                <CheckMark
                  checked={planeFigureOption.zDimmedThreshold === l.value}
                />
                {l.caption}
              </MenuItem>
            );
          })}
        </Dropdown.Menu>
      </Dropdown>
      {(active === 'wand' || active === 'wandEraser') && (
        <StyledSpanWandOption>
          <label>
            Threshold:
            <input
              className="wand-threshold-input"
              type="number"
              name="threshold"
              min="0"
              value={toolOptions.wandThreshold}
              onChange={ev =>
                setToolOption('wandThreshold', ev.target.valueAsNumber)
              }
            />
          </label>
          <label>
            Max distance:
            <input
              className="wand-max-distance-input"
              type="number"
              name="maxDistance"
              min="0"
              placeholder="mm"
              value={toolOptions.wandMaxDistance}
              onChange={ev =>
                setToolOption('wandMaxDistance', ev.target.valueAsNumber)
              }
            />
          </label>
          <label>
            Mode:
            <ShrinkSelect
              className="wand-option-shrinkselect"
              options={wandModeOptions}
              value={toolOptions.wandMode}
              onChange={mode => setToolOption('wandMode', mode)}
            />{' '}
          </label>
          <WandBaseValueEditor
            value={toolOptions.wandBaseValue}
            onChange={value => setToolOption('wandBaseValue', value)}
          />
        </StyledSpanWandOption>
      )}
    </StyledDiv>
  );
});

const StyledDiv = styled.div`
  flex: none;
  background-color: #333;
  button {
    height: 40px;
    padding: 0 7px;
    font-size: 170%;
  }
  .line-width-shrinkselect > button {
    font-size: 100%;
  }
  .layout-shrinkselect .dropdown-toggle .caption {
    display: none;
  }
  .checkmark {
    display: inline-block;
    width: 25px;
  }
`;

const StyledSpanWandOption = styled.span`
  margin-left: 10px;
  display: inline-flex;
  align-items: center;
  gap: 5px;

  label {
    color: #ffffff;
    display: flex;
    align-items: center;
  }

  input {
    font-size: 100%;
    height: 28.4px;
    padding: 1px 2px;
    color: black;
  }

  .wand-threshold-input {
    width: 4em;
  }

  .wand-max-distance-input {
    width: 4em;
  }

  .wand-base-value-input {
    width: 4em;
  }

  .wand-option-shrinkselect > button {
    font-size: 100%;
    height: 28.4px;
    padding: 1px 2px;
  }
`;

export default ToolBar;

const CheckMark: React.FC<{ checked: boolean }> = props => (
  <span className="checkmark">
    {props.checked && <Icon icon="glyphicon-ok" />}
  </span>
);

const ToolButton: React.FC<{
  name: string;
  icon: string;
  active: string;
  changeTool: any;
  shortcut?: string;
  disabled?: boolean;
}> = props => {
  const {
    name,
    icon,
    active,
    changeTool,
    disabled,
    shortcut,
    children
  } = props;

  const handleClick = () => !disabled && changeTool(name);
  useKeyboardShortcut(shortcut, handleClick);

  const style = active === name ? 'primary' : 'default';
  const iconSpan = <Icon icon={icon} />;
  const toolTip = (
    <Tooltip id="case-detail-toolbar-tooltip">
      {name[0].toUpperCase() +
        name.slice(1) +
        (shortcut ? ' (' + shortcut + ')' : '')}
    </Tooltip>
  );

  if (children) {
    return (
      <OverlayTrigger overlay={toolTip} placement="top" delayShow={200}>
        <SplitButton
          id={`toolbutton-${name}`}
          title={iconSpan}
          bsStyle={style}
          onClick={handleClick}
          disabled={disabled}
        >
          {children}
        </SplitButton>
      </OverlayTrigger>
    );
  } else {
    return (
      <OverlayTrigger overlay={toolTip} placement="top" delayShow={200}>
        <Button bsStyle={style} onClick={handleClick} disabled={disabled}>
          {iconSpan}
        </Button>
      </OverlayTrigger>
    );
  }
};

const MenuItemWithShortcut: React.FC<
  { shortcut?: string } & MenuItemProps
> = props => {
  const { shortcut, children, ...rest } = props;
  useKeyboardShortcut(shortcut, props.onClick || (() => {}));
  return (
    <MenuItem {...rest}>
      <ShortcutBox>
        <span>{children}</span>
        {shortcut && <kbd>{shortcut}</kbd>}
      </ShortcutBox>
    </MenuItem>
  );
};

const ShortcutBox = styled.div`
  display: flex;
  justify-content: space-between;
  kbd {
    background-color: inherit;
    color: inherit;
    border: none;
  }
`;

const WandBaseValueEditor: Editor<ReferenceValueOption> = props => {
  const { value, onChange } = props;

  const onAutoChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const isAuto = ev.target.checked;
    onChange(isAuto ? 'clickPoint' : 0);
  };

  const onNumberChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(ev.target.value));
  };

  return (
    <>
      <label>
        Reference value:
        {typeof value === 'number' && (
          <input
            className="wand-base-value-input"
            type="number"
            value={value}
            onChange={onNumberChange}
          />
        )}
        <label>
          <input
            type="checkbox"
            checked={value === 'clickPoint'}
            onChange={onAutoChange}
          />
          Auto
        </label>
      </label>
    </>
  );
};
