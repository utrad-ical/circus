import React from 'react';
import styled, { css } from 'styled-components';

type MenuItemProps = {
  eventKey?: string | number;
  disabled?: boolean;
  onSelect?: (eventKey: string | number, event: React.MouseEvent) => void;
  divider?: boolean;
  header?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  href?: string;
  children?: React.ReactNode;
};

const Item = styled.li`
  list-style: none;
  text-align: left;
`;

const baseStyle = css`
  pointer-events: auto;
  padding: 0.2em 1em;
  width: 100%;
  color: black;
  &:hover {
    background-color: ${(props: { $disabled: boolean }) =>
      props.$disabled ? 'inherit' : '#eee'};
  }
  cursor: ${(props: { $disabled: boolean }) =>
    props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${(props: { $disabled: boolean }) => (props.$disabled ? 0.5 : 1)};
  [data-icon] {
    margin-inline: 0 0.5em;
  }
  button > [data-icon] {
    margin-inline: 0;
  }
`;

const ItemButton = styled.button<{ $disabled?: boolean }>`
  ${baseStyle}
  display: flex;
  align-items: center;
  background: none;
  border: none;
  text-align: left;
  font-size: 1em;
`;

const ItemLink = styled.a<{ $disabled?: boolean }>`
  ${baseStyle}
  display: block;
  text-decoration: none;
  &:hover {
    color: black;
    text-decoration: none;
  }
`;

const Divider = styled.hr`
  margin: 0.5em 0;
  border: none;
  height: 1px;
  background-color: #e5e5e5;
`;

const Header = styled.li`
  color: #777777;
  font-size: 0.85em;
  padding: 0.25em 1.5em;
  list-style: none;
  text-align: left;
`;

const MenuItem: React.FC<MenuItemProps> = ({
  eventKey,
  disabled,
  onSelect,
  divider,
  header,
  onClick,
  href,
  children
}) => {
  if (divider) return <Divider role="separator" />;
  if (header) return <Header role="presentation">{children}</Header>;

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
    onSelect?.(eventKey ?? '', e);
  };

  return (
    <Item role="presentation">
      {href ? (
        <ItemLink href={href} onClick={handleClick} $disabled={disabled}>
          {children}
        </ItemLink>
      ) : (
        <ItemButton
          type="button"
          onClick={handleClick}
          $disabled={disabled}
          aria-disabled={disabled}
        >
          {children}
        </ItemButton>
      )}
    </Item>
  );
};

export default MenuItem;
