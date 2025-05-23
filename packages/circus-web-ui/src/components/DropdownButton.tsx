import React, { useState } from 'react';
import styled, { css } from 'styled-components';

import {
  autoUpdate,
  flip,
  offset,
  Placement,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole
} from '@floating-ui/react';
import Icon from './Icon';

type Variant = 'default' | 'primary' | 'link' | 'danger';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<Size, string> = {
  xs: '0.9em',
  sm: '1em',
  md: '1.25em',
  lg: '1.5em',
  xl: '2em'
};

const variantStyles: Record<Variant, any> = {
  default: css`
    background-color: white;
    color: #111111;
    border: 1px solid silver;
    &:hover {
      background-color: #d5d5d5;
    }
  `,
  primary: css`
    background-color: #007bff;
    color: white;
    &:hover {
      background-color: #0069d9;
    }
  `,
  link: css`
    background: none;
    color: #007bff;
    text-decoration: underline;
    &:hover {
      color: #0056b3;
    }
  `,
  danger: css`
    background-color: #dc3545;
    color: white;
    &:hover {
      background-color: #c82333;
    }
  `
};

const TriggerButton = styled.button<{
  $variant: Variant;
  $size: Size;
  $noCaret?: boolean;
}>`
  line-height: 1.5;
  cursor: pointer;
  display: inline-block;
  align-items: center;
  font-size: ${(props: { $size: Size }) => sizeMap[props.$size]};
  ${(props: { $variant: Variant }) => variantStyles[props.$variant]};
  ${(props: { $noCaret: boolean }) => !props.$noCaret && 'padding-right: 0;'}
`;

const Menu = styled.div.attrs({ className: 'dropdown-menu show' })`
  background: white;
  border: 1px solid #ddd;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  min-width: 160px;
  padding: 4px 0;
  z-index: 1000;
`;

const caretIconMap: Record<string, string> = {
  top: 'material-arrow_drop_up',
  bottom: 'material-arrow_drop_down',
  left: 'material-arrow_left',
  right: 'material-arrow_right'
};

type DropdownProps = {
  title: React.ReactNode;
  children: React.ReactNode;
  placement?: Placement;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  noCaret?: boolean;
  onSelect?: (value: string) => void;
};

const DropdownButton: React.FC<DropdownProps> = ({
  title,
  children,
  placement = 'bottom-start',
  variant = 'default',
  size = 'md',
  disabled = false,
  id,
  className,
  style,
  noCaret = false,
  onSelect
}) => {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    middleware: [offset(2), flip(), shift()],
    whileElementsMounted: autoUpdate,
    placement
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role
  ]);

  const direction = placement.split('-')[0];
  const caretIcon = caretIconMap[direction] ?? 'material-arrow_drop_down';

  return (
    <>
      <TriggerButton
        ref={refs.setReference}
        id={id}
        disabled={disabled}
        className={className}
        style={style}
        aria-haspopup="menu"
        aria-expanded={open}
        {...getReferenceProps()}
        $variant={variant}
        $size={size}
        $noCaret={noCaret}
      >
        {title}
        {!noCaret && <Icon icon={caretIcon} size="md" aria-hidden="true" />}
      </TriggerButton>

      {open && (
        <Menu
          ref={refs.setFloating}
          style={floatingStyles}
          role="menu"
          {...getFloatingProps()}
        >
          {React.Children.map(children, child => {
            if (!React.isValidElement(child)) return child;

            const value = child.props['data-value'];

            const handleClick = (event: React.MouseEvent) => {
              child.props.onClick?.(event);
              if (value && onSelect) onSelect(value);
              setOpen(false);
            };

            return React.cloneElement(child as React.ReactElement, {
              role: 'menuitem',
              tabIndex: -1,
              onClick: handleClick
            });
          })}
        </Menu>
      )}
    </>
  );
};

export default DropdownButton;
