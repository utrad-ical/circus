import React, { Fragment } from 'react';
import { Button, SplitButton, MenuItem } from 'components/react-bootstrap';
import ShrinkSelect from 'rb/ShrinkSelect';
import Icon from 'components/Icon';
import { prompt } from 'rb/modal';

const LayoutRenderer = props => {
  return (
    <Fragment>
      <Icon icon={props.icon} />
      <span className="caption">&ensp;{props.caption}</span>
    </Fragment>
  );
};

const ToolBar = props => {
  const {
    active,
    viewOptions,
    onChangeViewOptions,
    brushEnabled,
    lineWidth,
    setLineWidth,
    windowPresets = [],
    onChangeTool,
    onApplyWindow
  } = props;

  const widthOptions = [1, 3, 5, 7];

  const handleToggleReferenceLine = checked => {
    onChangeViewOptions({ ...viewOptions, showReferenceLine: checked });
  };

  const handleChangeLayout = selection => {
    onChangeViewOptions({ ...viewOptions, layout: selection });
  };

  const handleToggleInterpolationMode = checked => {
    onChangeViewOptions({
      ...viewOptions,
      interpolationMode: checked ? 'trilinear' : 'nearestNeighbor'
    });
  };

  const handleApplyWindow = async selection => {
    if ('level' in selection && 'width' in selection) {
      onApplyWindow({ level: selection.level, width: selection.width });
    } else {
      const value = await prompt('Input window level/width (e.g., "20,100")');
      const [level, width] = value.split(/\,|\//).map(s => parseInt(s, 10));
      if (width <= 0 || isNaN(level) || isNaN(width)) return;
      onApplyWindow({ level, width });
    }
  };

  const layoutOptions = {
    twoByTwo: { caption: '2 x 2', icon: 'circus-layout-four' },
    axial: { caption: 'Axial', icon: 'circus-orientation-axial' },
    sagittal: { caption: 'Sagittal', icon: 'circus-orientation-sagittal' },
    coronal: { caption: 'Coronal', icon: 'circus-orientation-coronal' }
  };

  return (
    <div className="case-detail-toolbar">
      <ToolButton
        name="pager"
        icon="rs-pager"
        changeTool={onChangeTool}
        active={active}
      />
      <ToolButton
        name="zoom"
        icon="rs-zoom"
        changeTool={onChangeTool}
        active={active}
      />
      <ToolButton
        name="hand"
        icon="rs-hand"
        changeTool={onChangeTool}
        active={active}
      />
      <ToolButton
        name="window"
        icon="rs-window"
        changeTool={onChangeTool}
        active={active}
      >
        {windowPresets.map((p, i) => (
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
      <ToolButton
        name="brush"
        icon="rs-brush"
        changeTool={onChangeTool}
        active={active}
        disabled={!brushEnabled}
      />
      <ToolButton
        name="eraser"
        icon="rs-eraser"
        changeTool={onChangeTool}
        active={active}
        disabled={!brushEnabled}
      />
      <ShrinkSelect
        className="line-width-shrinkselect"
        options={widthOptions}
        value={'' + lineWidth}
        onChange={val => setLineWidth(parseInt(val, 10))}
      />
      <ToolButton
        name="bucket"
        icon="rs-bucket"
        changeTool={onChangeTool}
        active={active}
        disabled={!brushEnabled}
      />
      <ShrinkSelect
        className="layout-shrinkselect"
        name="layout"
        options={layoutOptions}
        value={viewOptions.layout}
        renderer={LayoutRenderer}
        onChange={handleChangeLayout}
      />
      &ensp;
      <label>
        <input
          type="checkbox"
          checked={viewOptions.showReferenceLine}
          onChange={ev => handleToggleReferenceLine(ev.target.checked)}
        />
        Reference line
      </label>
      &ensp;
      <label>
        <input
          type="checkbox"
          checked={viewOptions.interpolationMode === 'trilinear'}
          onChange={ev => handleToggleInterpolationMode(ev.target.checked)}
        />Trilinear
      </label>
    </div>
  );
};
export default ToolBar;

const ToolButton = props => {
  const { name, icon, active, changeTool, disabled, children } = props;
  const style = active === name ? 'primary' : 'default';
  const iconSpan = <Icon icon={icon} />;
  const onClick = () => !disabled && changeTool(name);
  if (children) {
    return (
      <SplitButton
        id={`toolbutton-${name}`}
        title={iconSpan}
        bsStyle={style}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </SplitButton>
    );
  } else {
    return (
      <Button bsStyle={style} onClick={onClick} disabled={disabled}>
        {iconSpan}
      </Button>
    );
  }
};
