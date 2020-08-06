import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import classNames from 'classnames';
import { Glyphicon } from 'components/react-bootstrap';

const StyledSideBar = styled.div`
  overflow: hidden;
  height: 100%;
  flex: 0 0 30px;
  display: flex;
  flex-direction: column;
  .bar {
    text-align: right;
  }
  &.open {
    overflow-x: hidden;
    overflow-y: auto;
    flex: 0 0 320px;
    > .bar > .triangle {
      transform: rotate(180deg);
    }
  }
`;

const SideContainer: React.FC<{}> = React.memo(props => {
  const [open, setOpen] = useState(true);

  const handleToggle = useCallback(() => {
    setOpen(!open);
  }, [open]);

  return (
    <StyledSideBar className={classNames({ open })}>
      <div className="bar" onClick={handleToggle}>
        <Glyphicon className="triangle" glyph="triangle-right" />
      </div>
      {open && props.children}
    </StyledSideBar>
  );
});

export default SideContainer;
