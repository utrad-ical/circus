import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import classNames from 'classnames';
import { Glyphicon } from 'components/react-bootstrap';

const StyledSideBar = styled.div`
  overflow: hidden;
  height: 100%;
  flex: 0 0 20px; // collapsed side bar width
  display: flex;
  flex-direction: column;
  .bar {
    text-align: center;
    cursor: pointer;
    flex: 1 0 auto;
    background: ${(props: any) => props.theme.brandDark};
    &:hover {
      background: ${(props: any) => props.theme.brandPrimary};
    }
    color: white;
  }
  &.open {
    flex: 0 0 320px; // side bar width
    > .bar {
      text-align: right;
      flex: 0 0 auto;
      color: ${(props: any) => props.theme.brandPrimary};
      background: white;
      .triangle {
        transform: rotate(180deg);
      }
    }
  }
  .scrollable {
    overflow-x: hidden;
    overflow-y: auto;
    flex: 1 1 auto;
    min-height: 1px;
  }
  .collapser {
    margin-bottom: 1px;
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
      {open && <div className="scrollable">{props.children}</div>}
    </StyledSideBar>
  );
});

export default SideContainer;
