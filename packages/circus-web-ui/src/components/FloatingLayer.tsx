import {
  autoUpdate,
  FloatingContext,
  Middleware,
  Placement,
  safePolygon,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions
} from '@floating-ui/react';
import { useState } from 'react';

type Trigger = 'hover' | 'click' | 'focus' | 'manual';

export type FloatingLayerProps = {
  trigger?: Trigger;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: Placement;
  useSafePolygon?: boolean;
  middleware?: Middleware[];
  children: (props: {
    open: boolean;
    setOpen: (open: boolean) => void;
    refs: ReturnType<typeof useFloating>['refs'];
    floatingStyles: ReturnType<typeof useFloating>['floatingStyles'];
    getReferenceProps: ReturnType<typeof useInteractions>['getReferenceProps'];
    getFloatingProps: ReturnType<typeof useInteractions>['getFloatingProps'];
    context: FloatingContext;
  }) => JSX.Element;
};

const FloatingLayer = ({
  trigger = 'hover',
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  placement = 'bottom-start',
  useSafePolygon = false,
  middleware = [],
  children
}: FloatingLayerProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    middleware,
    whileElementsMounted: autoUpdate
  });

  const interactions = [];
  const click = useClick(context);
  const hover = useHover(
    context,
    useSafePolygon ? { handleClose: safePolygon() } : undefined
  );
  const focus = useFocus(context);

  if (trigger === 'click') interactions.push(click);
  if (trigger === 'hover') interactions.push(hover);
  if (trigger === 'focus') interactions.push(focus);

  interactions.push(useDismiss(context));

  const { getReferenceProps, getFloatingProps } = useInteractions(interactions);

  return children({
    open,
    setOpen,
    refs,
    floatingStyles,
    getReferenceProps,
    getFloatingProps,
    context
  });
};

export default FloatingLayer;
