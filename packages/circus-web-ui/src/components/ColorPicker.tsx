import classnames from 'classnames';
import React, { type FC, type KeyboardEvent, useRef } from 'react';
import tinycolor from 'tinycolor2';
import type { ButtonSize } from './Button.tsx';
import styles from './ColorPicker.module.css';
import PopoverButton from './PopoverButton.tsx';
import Slider from './Slider.tsx';

// Colors based on simple-color-picker released under the MIT License
// Copyright (c) 2010 Rachel Carvalho <rachel.carvalho@gmail.com>
// prettier-ignore
const defaultColors = [
  '#000000', '#444444', '#666666', '#999999',
  '#cccccc', '#eeeeee', '#f3f3f3', '#ffffff',
  '#ff0000', '#ff9900', '#ffff00', '#00ff00',
  '#00ffff', '#0000ff', '#9900ff', '#ff00ff',
  '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3',
  '#d0e0e3', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8',
  '#a2c4c9', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#e06666', '#f6b26b', '#ffd966', '#93c47d',
  '#76a5af', '#6fa8dc', '#8e7cc3', '#c27ba0',
  '#cc0000', '#e69138', '#f1c232', '#6aa84f',
  '#45818e', '#3d85c6', '#674ea7', '#a64d79',
  '#990000', '#b45f06', '#bf9000', '#38761d',
  '#134f5c', '#0b5394', '#351c75', '#741b47',
  '#660000', '#783f04', '#7f6000', '#274e13',
  '#0c343d', '#073763', '#20124d', '#4C1130'
];

/**
 * A grid of color swatches. The arrow keys move the focus between colors.
 */
export const ColorPalette: FC<{
  value: string;
  onChange?: (value: string) => void;
  colors?: string[];
  withAlpha?: boolean;
  itemsPerRow?: number;
  disabled?: boolean;
  className?: string;
}> = props => {
  const {
    value,
    onChange,
    colors = defaultColors,
    withAlpha,
    itemsPerRow = 8,
    disabled,
    className
  } = props;
  const paletteRef = useRef<HTMLDivElement>(null);
  // Compares colors in the same notation (e.g., lowercase hex)
  const normalize = (color: string) => tinycolor(color).toHexString();
  const rgbValue = normalize(value);
  const alphaValue = withAlpha ? tinycolor(value).getAlpha() : 1;
  const selectedIndex = colors.findIndex(c => normalize(c) === rgbValue);

  const select = (color: string) => {
    if (disabled) return;
    onChange?.(
      withAlpha ? tinycolor(color).setAlpha(alphaValue).toHex8String() : color
    );
  };

  const handleKeyDown = (ev: KeyboardEvent) => {
    const delta = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -itemsPerRow,
      ArrowDown: itemsPerRow
    }[ev.key];
    if (delta === undefined) return;
    const swatches = Array.from(paletteRef.current!.children) as HTMLElement[];
    const next = swatches[swatches.indexOf(ev.target as HTMLElement) + delta];
    if (next) {
      next.focus();
      ev.preventDefault();
    }
  };

  return (
    <div>
      <div
        ref={paletteRef}
        role="listbox"
        aria-label="Colors"
        aria-disabled={disabled}
        className={classnames(
          styles.palette,
          disabled && styles.disabled,
          className
        )}
        onKeyDown={handleKeyDown}
      >
        {colors.map((color, i) => (
          <button
            key={i}
            type="button"
            role="option"
            aria-label={color}
            aria-selected={i === selectedIndex}
            // Only the selected (or first) color is in the tab order
            tabIndex={i === Math.max(selectedIndex, 0) ? 0 : -1}
            disabled={disabled}
            className={styles.color}
            style={{ backgroundColor: color }}
            onClick={() => select(color)}
          />
        ))}
      </div>
      {withAlpha && (
        <Slider
          className={styles.alpha}
          aria-label="Opacity"
          disabled={disabled}
          value={alphaValue}
          min={0}
          max={1}
          step={0.01}
          onChange={alpha =>
            onChange?.(tinycolor(value).setAlpha(alpha).toHex8String())
          }
        />
      )}
    </div>
  );
};

/**
 * A button that shows the current color and opens a `ColorPalette`.
 */
const ColorPicker: FC<{
  value: string;
  onChange?: (value: string) => void;
  colors?: string[];
  withAlpha?: boolean;
  showColorCode?: boolean;
  boxPreview?: boolean;
  noCaret?: boolean;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
}> = props => {
  const {
    value,
    onChange,
    colors,
    withAlpha,
    showColorCode,
    boxPreview,
    noCaret,
    size,
    disabled,
    className
  } = props;
  const tc = tinycolor(value || '#ffffff');
  const colorStyle = {
    backgroundColor: tc.toHexString(),
    color: tinycolor.mostReadable(tc, ['#000', '#fff']).toHexString()
  };
  const code = withAlpha ? tc.toHex8String() : tc.toHexString();

  return (
    <PopoverButton
      title={
        <>
          {boxPreview && <span className={styles.preview} style={colorStyle} />}
          {showColorCode ? code : <span>&thinsp;</span>}
        </>
      }
      size={size}
      noCaret={noCaret}
      disabled={disabled}
      className={className}
      style={boxPreview ? undefined : colorStyle}
      popupRole="dialog"
      popupClassName={styles.popup}
      onOpen={popup =>
        popup
          .querySelector<HTMLElement>('[role="option"][tabindex="0"]')
          ?.focus()
      }
    >
      <ColorPalette
        value={value}
        colors={colors}
        withAlpha={withAlpha}
        onChange={onChange}
        disabled={disabled}
      />
    </PopoverButton>
  );
};

export default ColorPicker;
