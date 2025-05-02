// components/Menu.tsx
import {
  autoUpdate,
  Middleware,
  Placement,
  safePolygon,
  useFloating,
  useHover,
  useInteractions
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
  useSafePolygon?: boolean;
  middleware?: Middleware[];
  className?: string;
}> = ({
  name,
  icon,
  link,
  onClick,
  children,
  placement = 'bottom-start',
  useSafePolygon = false,
  middleware = [],
  className
}) => {
  icon = icon ?? `circus-${name.toLowerCase()}`;
  console.log('icon', icon);
  const caption = (
    <>
      <Icon icon={icon} size="lg" className="navmenu" />
      <span className="hidden-xs">{name}</span>
    </>
  );

  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: placement,
    middleware,
    whileElementsMounted: autoUpdate
  });

  const hover = useHover(
    context,
    useSafePolygon ? { handleClose: safePolygon() } : undefined
  );
  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

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
        >
          {children}
        </ul>
      )}
    </li>
  );
};

export default NavMenu;
