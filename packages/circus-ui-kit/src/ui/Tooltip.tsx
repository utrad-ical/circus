import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

interface TooltipProps {
  children: React.ReactNode;
  text: React.ReactNode;
  options?: {
    position: 'top' | 'bottom';
    aligned: 'left' | 'center' | 'right';
  };
}

interface StyledTooltipProps {
  upperLeft: { x: number; y: number };
  options: { position: 'top' | 'bottom'; aligned: 'left' | 'center' | 'right' };
  tooltipSize: { width: number; height: number };
  childCenter: { x: number; y: number };
}

const arrowSize = 6;

const StyledTooltip = styled.div<StyledTooltipProps>`
  position: absolute;
  top: ${(props: StyledTooltipProps) => props.upperLeft.y}px;
  left: ${(props: StyledTooltipProps) => props.upperLeft.x}px;
  background-color: black;
  color: white;
  padding: 5px;
  border-radius: 3px;
  white-space: nowrap;
  &:after {
    content: '';
    position: absolute;
    bottom: ${(props: StyledTooltipProps) =>
      props.options.position === 'top' ? `${-arrowSize * 2 + 1}px` : '100%'};
    left: ${(props: StyledTooltipProps) =>
      props.options.aligned === 'left'
        ? `${arrowSize + 1}px`
        : props.options.aligned === 'center'
        ? `${props.childCenter.x - props.upperLeft.x}px`
        : `${props.tooltipSize.width - (arrowSize + 1)}px`};
    margin-left: ${() => `${-arrowSize}px`};
    border-width: ${() => `${arrowSize}px`};
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
  const [childCenter, setChildCenter] = useState({ x: 0, y: 0 });
  const [tooltipSize, setTooltipSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (childRef.current) {
      const rect = childRef.current.getBoundingClientRect();
      setChildCenter({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });

      let x = Math.max(rect.left + rect.width / 2 - tooltipSize.width / 2, 0);
      const { innerWidth: width, innerHeight: height } = window;
      if (x + tooltipSize.width > width) {
        x = width - tooltipSize.width;
      }

      if (options.aligned === 'left') {
        x = rect.left;
      } else if (options.aligned === 'right') {
        x = rect.right - tooltipSize.width;
      }
      if (options.position === 'top') {
        setPosition({ x, y: rect.top - tooltipSize.height - arrowSize });
      } else {
        setPosition({ x, y: rect.bottom + arrowSize });
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
            childCenter={childCenter}
          >
            {text}
          </StyledTooltip>,
          tooltipContainer
        )}
    </>
  );
};

export default Tooltip;
