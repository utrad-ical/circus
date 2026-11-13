import React, { type FC } from 'react';
import Button from './Button.tsx';
import styles from './Pagination.module.css';

/**
 * Buttons to move between pages (1-based), showing up to 5 page numbers.
 */
const Pagination: FC<{
  activePage: number;
  pages: number;
  onSelect: (page: number) => void;
  disabled?: boolean;
}> = props => {
  const { activePage, pages, onSelect, disabled } = props;
  const first = Math.max(1, activePage - 2);
  const last = Math.min(pages, activePage + 2);
  const numbers: number[] = [];
  for (let i = first; i <= last; i++) numbers.push(i);

  const select = (page: number) => {
    if (page >= 1 && page <= pages && page !== activePage) onSelect(page);
  };

  const atStart = activePage <= 1;
  const atEnd = pages <= 0 || activePage >= pages;

  return (
    <nav className={styles.pagination} aria-label="Pages">
      <Button
        title="First page"
        disabled={disabled || atStart}
        onClick={() => select(1)}
      >
        &laquo;
      </Button>
      <Button
        title="Previous page"
        disabled={disabled || atStart}
        onClick={() => select(activePage - 1)}
      >
        &lsaquo;
      </Button>
      {numbers.map(i => (
        <Button
          key={i}
          variant={i === activePage ? 'primary' : 'default'}
          aria-current={i === activePage ? 'page' : undefined}
          disabled={disabled}
          onClick={() => select(i)}
        >
          {i}
        </Button>
      ))}
      <Button
        title="Next page"
        disabled={disabled || atEnd}
        onClick={() => select(activePage + 1)}
      >
        &rsaquo;
      </Button>
      <Button
        title="Last page"
        disabled={disabled || atEnd}
        onClick={() => select(pages)}
      >
        &raquo;
      </Button>
    </nav>
  );
};

export default Pagination;
