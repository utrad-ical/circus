import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import Icon from 'components/Icon';
import {
  Button,
  Dropdown,
  MenuItem,
  SplitButton
} from 'components/react-bootstrap';
import React, { Fragment } from 'react';

interface WindowPreset {
  label: string;
  level: number;
  width: number;
}

const LayoutRenderer: React.FC<{
  icon: any;
  caption: React.ReactChild;
}> = props => {
  return (
    <Fragment>
      <Icon icon={props.icon} />
      &ensp;
      <span className="caption">{props.caption}</span>
    </Fragment>
  );
};

const ToolBar: React.FC<{
  active: string;
  viewOptions: any;
  onChangeViewOptions: any;
  brushEnabled: boolean;
  lineWidth: number;
  setLineWidth: any;
  windowPresets?: WindowPreset[];
  onChangeTool: any;
  onApplyWindow: any;
}> = props => {
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

  const handleToggleReferenceLine = () => {
    onChangeViewOptions({
      ...viewOptions,
      showReferenceLine: !viewOptions.showReferenceLine
    });
  };

  const handleChangeLayout = (selection: any) => {
    onChangeViewOptions({ ...viewOptions, layout: selection });
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

  const handleApplyWindow = async (selection: WindowPreset) => {
    if ('level' in selection && 'width' in selection) {
      onApplyWindow({ level: selection.level, width: selection.width });
    } else {
      const value = await prompt('Input window level/width (e.g., "20,100")');
      const [level, width] = (value ? value : '0,0')
        .split(/,|\//)
        .map(s => parseInt(s, 10));
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

  const brushTools = ['brush', 'eraser', 'bucket'];
  const activeTool =
    !brushEnabled && brushTools.some(tool => tool === active)
      ? 'pager'
      : active;

  return (
    <div className="case-detail-toolbar">
      <ToolButton
        name="pager"
        icon="rs-pager"
        changeTool={onChangeTool}
        active={activeTool}
      />
      <ToolButton
        name="zoom"
        icon="rs-zoom"
        changeTool={onChangeTool}
        active={activeTool}
      />
      <ToolButton
        name="hand"
        icon="rs-hand"
        changeTool={onChangeTool}
        active={activeTool}
      />
      <ToolButton
        name="window"
        icon="rs-window"
        changeTool={onChangeTool}
        active={activeTool}
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
        active={activeTool}
        disabled={!brushEnabled}
      />
      <ToolButton
        name="eraser"
        icon="rs-eraser"
        changeTool={onChangeTool}
        active={activeTool}
        disabled={!brushEnabled}
      />
      <ShrinkSelect
        className="line-width-shrinkselect"
        options={widthOptions}
        value={'' + lineWidth}
        onChange={(val: string) => setLineWidth(parseInt(val, 10))}
        disabled={!brushEnabled}
      />
      <ToolButton
        name="bucket"
        icon="rs-bucket"
        changeTool={onChangeTool}
        active={activeTool}
        disabled={!brushEnabled}
      />
      &thinsp;
      <ShrinkSelect
        className="layout-shrinkselect"
        name="layout"
        options={layoutOptions}
        value={viewOptions.layout}
        renderer={LayoutRenderer}
        onChange={handleChangeLayout}
      />
      &thinsp;
      <Dropdown id="view-options-dropdown">
        <Dropdown.Toggle>
          <Icon icon="circus-tool" />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <MenuItem onClick={handleToggleReferenceLine}>
            {viewOptions.showReferenceLine && (
              <Fragment>
                <Icon icon="glyphicon-ok" />
                &ensp;
              </Fragment>
            )}
            Show reference line
          </MenuItem>
          <MenuItem onClick={handleToggleInterpolationMode}>
            {viewOptions.interpolationMode === 'trilinear' && (
              <Fragment>
                <Icon icon="glyphicon-ok" />
                &ensp;
              </Fragment>
            )}
            Trilinear filtering
          </MenuItem>
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};
export default ToolBar;

const ToolButton: React.FC<{
  name: string;
  icon: string;
  active: string;
  changeTool: any;
  disabled?: boolean;
}> = props => {
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
