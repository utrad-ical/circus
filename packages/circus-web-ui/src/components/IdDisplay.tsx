import IconButton from 'components/IconButton';
import { OverlayTrigger, Popover } from 'components/react-bootstrap';
import React from 'react';
import styled from 'styled-components';

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
            <IconButton
              icon="glyphicon-copy"
              bsSize="xs"
              bsStyle="link"
              onClick={() => navigator.clipboard.writeText(value[key])}
            />
          </div>
        );
      })}
    </MyPopover>
  );

  return (
    <OverlayTrigger trigger="click" rootClose placement="top" overlay={overlay}>
      <IconButton icon="glyphicon-zoom-in" bsStyle="link" bsSize="xs" />
    </OverlayTrigger>
  );
});

export default IdDisplay;
