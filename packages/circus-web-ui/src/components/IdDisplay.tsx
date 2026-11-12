import Button from '#components/Button.tsx';
import React from 'react';
import styled from 'styled-components';
import CopyToClipboardButton from './CopyToClipboardButton.tsx';
import { OverlayTrigger, Popover } from './react-bootstrap.ts';

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
            <CopyToClipboardButton size="xsmall" string={value[key]} />
          </div>
        );
      })}
    </MyPopover>
  );

  return (
    <OverlayTrigger trigger="click" rootClose placement="top" overlay={overlay}>
      <Button icon="material-zoom_in" variant="link" size="xsmall" />
    </OverlayTrigger>
  );
});

export default IdDisplay;
