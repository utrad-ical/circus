import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import classNames from 'classnames';
import Icon from 'components/Icon';

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
    background: var(--circus-brand-primary-dark);
    &:hover {
      background: var(--circus-brand-primary);
    }
    color: white;
  }
  &.open {
    flex: 0 0 350px; // side bar width
    > .bar {
      text-align: right;
      flex: 0 0 auto;
      color: var(--circus-brand-primary);
      background: var(--circus-background);
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
        <Icon className="triangle" icon="material-arrow_right" />
      </div>
      {open && <div className="scrollable">{props.children}</div>}
    </StyledSideBar>
  );
});

export default SideContainer;
