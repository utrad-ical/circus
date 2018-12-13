import React from 'react';
import { Button, SplitButton, MenuItem } from 'components/react-bootstrap';
import ShrinkSelect from 'rb/ShrinkSelect';

const ToolBar = props => {
  const {
    active,
    showReferenceLine,
    toggleReferenceLine,
    brushEnabled,
    lineWidth,
    setLineWidth,
    windowPresets = [],
    onChangeTool,
    onSelectWindowPreset
  } = props;

  const widthOptions = [1, 3, 5, 7];

  return (
    <div className="case-detail-toolbar">
      <ToolButton name="pager" changeTool={onChangeTool} active={active} />
      <ToolButton name="zoom" changeTool={onChangeTool} active={active} />
      <ToolButton name="hand" changeTool={onChangeTool} active={active} />
      <ToolButton name="window" changeTool={onChangeTool} active={active}>
        {windowPresets.map((p, i) => (
          <MenuItem
            key={i + 1}
            eventKey={i + 1}
            onClick={() => onSelectWindowPreset(+p)}
          >
            <b>{p.label}</b> {`(L: ${p.level} / W: ${p.width})`}
          </MenuItem>
        ))}
      </ToolButton>
      <ToolButton
        name="brush"
        changeTool={onChangeTool}
        active={active}
        disabled={!brushEnabled}
      />
      <ToolButton
        name="eraser"
        changeTool={onChangeTool}
        active={active}
        disabled={!brushEnabled}
      />
      <ShrinkSelect
        options={widthOptions}
        value={'' + lineWidth}
        onChange={setLineWidth}
      />
      <ToolButton
        name="bucket"
        changeTool={onChangeTool}
        active={active}
        disabled={!brushEnabled}
      />
      &ensp;
      <label>
        <input
          type="checkbox"
          checked={showReferenceLine}
          onChange={ev => toggleReferenceLine(ev.target.checked)}
        />
        Reference line
      </label>
    </div>
  );
};
export default ToolBar;

const ToolButton = props => {
  const { name, active, changeTool, disabled, children } = props;
  const style = active === name ? 'primary' : 'default';
  const icon = <span className={'case-detail-tool-icon rs-icon-' + name} />;
  const onClick = () => !disabled && changeTool(name);
  if (children) {
    return (
      <SplitButton
        id={`toolbutton-${name}`}
        title={icon}
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
        {icon}
      </Button>
    );
  }
};
