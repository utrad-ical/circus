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
    padding: 0.1145rem 0.5rem;
  `,
  primary: css`
    background-color: ${(props: any) => props.theme.brandPrimary};
    color: white;
    border: 1px solid transparent;
    padding: 0.375rem 0.75rem;
  `,
  link: css`
    background: none;
    border: none;
    color: ${(props: any) => props.theme.brandPrimary};
    text-decoration: underline;
  `,
  danger: css`
    background-color: #d9534f;
    border: 1px solid transparent;
    padding: 0.5rem 1.25rem;
    color: white;
  `
};

const TriggerButton = styled.button<{
  $variant: Variant;
  $size: Size;
  $noCaret?: boolean;
  $disabled?: boolean;
}>`
  line-height: 1.5;
  cursor: ${(props: { $disabled: boolean }) =>
    props.$disabled ? 'not-allowed' : 'pointer'};
  display: inline-block;
  align-items: center;
  font-size: ${(props: { $size: Size }) => sizeMap[props.$size]};
  ${(props: { $variant: Variant }) => variantStyles[props.$variant]};
  ${(props: { $noCaret: boolean }) => !props.$noCaret && 'padding-right: 0;'}
  opacity: ${(props: { $disabled: boolean }) => (props.$disabled ? 0.5 : 1)};
  &:hover {
    opacity: ${(props: { $disabled: boolean }) => (props.$disabled ? 0.5 : 1)};
    filter: ${(props: { $disabled: boolean }) =>
      props.$disabled ? 'none' : 'brightness(0.8)'};
  }
`;

const Menu = styled.div`
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

  const referenceProps = disabled
    ? { onClick: (e: React.MouseEvent) => e.preventDefault() }
    : getReferenceProps();
  const direction = placement.split('-')[0];
  const caretIcon = caretIconMap[direction] ?? 'material-arrow_drop_down';

  return (
    <>
      <TriggerButton
        ref={refs.setReference}
        id={id}
        $disabled={disabled}
        className={className}
        style={style}
        aria-haspopup="menu"
        aria-expanded={open}
        {...referenceProps}
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

            const eventKey =
              child.props.eventKey ?? child.props['data-event-key'];

            const handleClick = (event: React.MouseEvent) => {
              child.props.onClick?.(event);
              if (eventKey != null && onSelect) onSelect(eventKey);
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
