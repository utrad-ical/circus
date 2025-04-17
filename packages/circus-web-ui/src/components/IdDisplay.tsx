import React from 'react';
import styled from 'styled-components';
import CopyToClipboardButton from './CopyToClipboardButton';
import IconButton from './IconButton';
import { OverlayTrigger, Popover } from './react-bootstrap';

const MyPopover = styled(Popover)`
  font-size: 80%;
  max-width: none;
`;

const IdDisplay: React.FC<{
  value: { [key: string]: string };
}> = React.memo(props => {
  const { value } = props;

  const overlay = (
    <MyPopover className="series-popover" id={`series-popover`}>
      {Object.keys(value).map(key => {
        return (
          <div key={key}>
            <b>{key}:</b> {value[key]}
            <CopyToClipboardButton bsSize="xs" string={value[key]} />
          </div>
        );
      })}
    </MyPopover>
  );

  return (
    <OverlayTrigger trigger="click" rootClose placement="top" overlay={overlay}>
      <IconButton icon="material-zoom_in" bsStyle="link" bsSize="xs" />
    </OverlayTrigger>
  );
});

export default IdDisplay;
