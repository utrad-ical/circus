import React, {
  createContext,
  type FC,
  type MouseEvent,
  type ReactNode,
  useContext
} from 'react';
import Icon from './Icon.tsx';
import styles from './MenuItem.module.css';

/** Provided by the menu that contains the items */
export const MenuContext = createContext<{
  select: (
    eventKey: string | number | undefined,
    event: MouseEvent,
    keepOpen?: boolean
  ) => void;
}>({ select: () => {} });

export type MenuItemProps = {
  eventKey?: string | number;
  disabled?: boolean;
  onSelect?: (eventKey: string | number, event: MouseEvent) => void;
  divider?: boolean;
  header?: boolean;
  onClick?: (event: MouseEvent) => void;
  href?: string;
  type?: 'radio' | 'checkbox';
  checked?: boolean;
  children?: ReactNode;
};

const MenuItem: FC<MenuItemProps> = props => {
  const {
    eventKey,
    disabled,
    onSelect,
    divider,
    header,
    onClick,
    href,
    type,
    checked,
    children
  } = props;
  const { select } = useContext(MenuContext);

  if (divider) return <li role="separator" className={styles.divider} />;
  if (header)
    return (
      <li role="presentation" className={styles.header}>
        {children}
      </li>
    );

  const handleClick = (ev: MouseEvent) => {
    if (disabled) {
      ev.preventDefault();
      return;
    }
    onClick?.(ev);
    onSelect?.(eventKey ?? '', ev);
    select(eventKey, ev, type === 'checkbox');
  };

  const itemProps = {
    role: type ? `menuitem${type}` : 'menuitem',
    'aria-checked': type ? !!checked : undefined,
    tabIndex: -1,
    className: styles.item,
    'aria-disabled': disabled,
    onClick: handleClick
  };

  return (
    <li role="none">
      {href ? (
        <a href={href} {...itemProps}>
          {children}
        </a>
      ) : (
        <button type="button" {...itemProps}>
          {type === 'checkbox' && (
            <Icon
              icon={
                checked
                  ? 'material-check_box'
                  : 'material-check_box_outline_blank'
              }
            />
          )}
          {children}
        </button>
      )}
    </li>
  );
};

export default MenuItem;
