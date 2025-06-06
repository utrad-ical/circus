import React, { useState } from 'react';
import classnames from 'classnames';
import styled from 'styled-components';
import Icon from 'components/Icon';

const StyledDiv = styled.div`
  .collapser-header {
    display: block;
    text-decoration: none;
    user-select: none;
    color: white;
    padding: 2px 5px;
    background-color: ${(props: any) => props.theme.brandPrimary};
    font-weight: bold;
    cursor: pointer;
    &:hover {
      background-color: ${(props: any) => props.theme.brandDark};
    }
    .triangle {
      transition: transform 0.1s linear;
    }
  }

  .collapser-body {
    padding: 15px;
    .property-editor {
      margin: 0 15px;
    }
  }

  &.open {
    .triangle {
      transform: rotate(90deg);
    }
  }

  &.framed {
    border: 1px solid ${(props: any) => props.theme.brandDark};
  }

  &.no-padding {
    .collapser-body {
      padding: 0;
    }
  }
`;

interface Props {
  onToggleClick?: () => void;
  title: React.ReactNode;
  className?: string;
  framed?: boolean;
  noPadding?: boolean;
}

export const ControlledCollapser: React.FC<
  Props & {
    open?: boolean;
  }
> = props => {
  const { open, onToggleClick, title, children, className, framed, noPadding } =
    props;
  return (
    <StyledDiv
      className={classnames(
        'collapser',
        { framed, 'no-padding': noPadding, open },
        className
      )}
    >
      <a className="collapser-header" onClick={onToggleClick}>
        {title}
        &ensp;
        <Icon className="triangle" icon="material-arrow_right" />
      </a>
      {open && <div className="collapser-body">{children}</div>}
    </StyledDiv>
  );
};

const Collapser: React.FC<
  Props & {
    defaultOpen?: boolean;
  }
> = props => {
  const { defaultOpen = true, onToggleClick, ...rest } = props;
  const [open, setOpen] = useState(!!defaultOpen);

  const handleToggleClick = () => {
    setOpen(open => !open);
    onToggleClick && onToggleClick();
  };

  return (
    <ControlledCollapser
      open={open}
      onToggleClick={handleToggleClick}
      {...rest}
    />
  );
};

export default Collapser;
