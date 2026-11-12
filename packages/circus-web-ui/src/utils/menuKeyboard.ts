/**
 * Moves the focus among the items of a menu with the arrow keys,
 * wrapping around at both ends.
 * Returns true if the key was handled.
 */
const moveMenuFocus = (items: HTMLElement[], key: string): boolean => {
  if (items.length === 0) return false;
  const index = items.indexOf(document.activeElement as HTMLElement);
  let next: number;
  if (key === 'ArrowDown') next = index < 0 ? 0 : (index + 1) % items.length;
  else if (key === 'ArrowUp')
    next =
      index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length;
  else if (key === 'Home') next = 0;
  else if (key === 'End') next = items.length - 1;
  else return false;
  items[next].focus();
  return true;
};

export default moveMenuFocus;
