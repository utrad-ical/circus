import {
  autoUpdate,
  Placement,
  safePolygon,
  useFloating,
  useHover,
  useInteractions,
  FloatingContext
} from '@floating-ui/react';
import classNames from 'classnames';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';

const NavMenu: React.FC<{
  name: string;
  icon?: string;
  link?: string;
  onClick?: (ev: React.MouseEvent) => void;
  children?: React.ReactNode;
  placement?: Placement;
  className?: string;
}> = ({
  name,
  icon,
  link,
  onClick,
  children,
  placement = 'bottom-start',
  className
}) => {
  icon = icon ?? `circus-${name.toLowerCase()}`;
  const caption = (
    <>
      <Icon icon={icon} size="lg" className="navmenu" />
      <span className="hidden-xs">{name}</span>
    </>
  );

  const [open, setOpen] = useState(false);
  const isDropdown = children != null && !(onClick || link);

  const { refs, floatingStyles, context } = useFloating({
    open: isDropdown ? open : false,
    onOpenChange: setOpen,
    placement: placement,
    whileElementsMounted: autoUpdate
  });

  const hover = useHover(context as FloatingContext<Element>, {
    handleClose: safePolygon({
      blockPointerEvents: true
    })
  });
  const { getReferenceProps, getFloatingProps } = useInteractions(
    isDropdown ? [hover] : []
  );

  return (
    <li
      className={classNames('icon-menu', className)}
      ref={refs.setReference}
      {...getReferenceProps()}
    >
      {link ? (
        <Link to={link}>{caption}</Link>
      ) : onClick ? (
        <a onClick={onClick} href="#">
          {caption}
        </a>
      ) : (
        caption
      )}
      {open && children && (
        <ul
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="dropdown"
        >
          {children}
        </ul>
      )}
    </li>
  );
};

export default NavMenu;
