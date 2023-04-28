import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
  options?: {
    position: 'top' | 'bottom';
    aligned: 'left' | 'center' | 'right';
  };
}

interface StyledTooltipProps {
  upperLeft: { x: number; y: number };
  options: { position: 'top' | 'bottom'; aligned: 'left' | 'center' | 'right' };
  tooltipSize: { width: number; height: number };
}

const StyledTooltip = styled.div<StyledTooltipProps>`
  position: absolute;
  top: ${(props: StyledTooltipProps) => props.upperLeft.y}px;
  left: ${(props: StyledTooltipProps) => props.upperLeft.x}px;
  background-color: black;
  color: white;
  padding: 5px;
  border-radius: 3px;
  &:after {
    content: '';
    position: absolute;
    bottom: ${(props: StyledTooltipProps) =>
      props.options.position === 'top' ? '-10px' : '100%'};
    left: ${(props: StyledTooltipProps) =>
      props.options.aligned === 'left'
        ? '7px'
        : props.options.aligned === 'center'
        ? '50%'
        : `${props.tooltipSize.width - 7}px`};
    margin-left: -6px;
    border-width: 6px;
    border-style: solid;
    border-color: ${(props: StyledTooltipProps) =>
      props.options.position === 'top'
        ? 'black transparent transparent transparent'
        : 'transparent transparent black transparent'};
  }
`;

const Tooltip: React.FC<TooltipProps> = ({
  children,
  text,
  options = { position: 'bottom', aligned: 'center' }
}) => {
  const [visible, setVisible] = useState(false);
  const [tooltipContainer, setTooltipContainer] =
    useState<HTMLDivElement | null>(null);
  const childRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (childRef.current) {
      const rect = childRef.current.getBoundingClientRect();
      let x = rect.left + rect.width / 2 - tooltipSize.width / 2;
      if (options.aligned === 'left') {
        x = rect.left;
      } else if (options.aligned === 'right') {
        x = rect.right - tooltipSize.width;
      }
      if (options.position === 'top') {
        setPosition({ x, y: rect.top - tooltipSize.height - 6 });
      } else {
        setPosition({ x, y: rect.bottom + 6 });
      }
    }
  }, [childRef, tooltipSize]);

  useEffect(() => {
    if (tooltipRef.current) {
      setTooltipSize({
        width: tooltipRef.current.clientWidth,
        height: tooltipRef.current.clientHeight
      });
    }
  }, [visible]);

  useEffect(() => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    setTooltipContainer(container);

    return () => {
      document.body.removeChild(container);
    };
  }, []);

  if (!tooltipContainer) {
    return null;
  }

  return (
    <>
      <div
        ref={childRef}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        style={{ display: 'inline-block' }}
      >
        {children}
      </div>
      {visible &&
        createPortal(
          <StyledTooltip
            ref={tooltipRef}
            upperLeft={position}
            options={options}
            tooltipSize={tooltipSize}
          >
            {text}
          </StyledTooltip>,
          tooltipContainer
        )}
    </>
  );
};

export default Tooltip;
