import classnames from 'classnames';
import React, {
  Children,
  type FC,
  isValidElement,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useRef,
  useState
} from 'react';
import styles from './Tabs.module.css';

type TabKey = string | number;

type TabProps = { eventKey: TabKey; title: ReactNode; children?: ReactNode };

/**
 * One tab of `Tabs`. It renders nothing by itself.
 */
export const Tab: FC<TabProps> = () => null;

let counter = 0;

/**
 * Shows the content of the active `Tab`. Works either as a controlled
 * (`activeKey` and `onSelect`) or uncontrolled (`defaultActiveKey`) component.
 */
const Tabs: FC<{
  activeKey?: TabKey;
  defaultActiveKey?: TabKey;
  onSelect?: (key: TabKey) => void;
  className?: string;
  children: ReactNode;
}> = props => {
  const { activeKey, defaultActiveKey, onSelect, className, children } = props;
  const [tabsId] = useState(() => `circus-tabs-${++counter}`);
  const tabs = Children.toArray(children).filter(
    (c): c is ReactElement<TabProps> => isValidElement(c)
  );
  const [innerKey, setInnerKey] = useState(
    defaultActiveKey ?? tabs[0]?.props.eventKey
  );
  const current = activeKey ?? innerKey;
  const listRef = useRef<HTMLDivElement>(null);

  const select = (key: TabKey) => {
    setInnerKey(key);
    if (key !== current) onSelect?.(key);
  };

  const handleKeyDown = (ev: KeyboardEvent) => {
    const index = tabs.findIndex(t => t.props.eventKey === current);
    const delta = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
    const next =
      ev.key === 'Home'
        ? 0
        : ev.key === 'End'
          ? tabs.length - 1
          : delta
            ? (index + delta + tabs.length) % tabs.length
            : -1;
    if (next < 0) return;
    ev.preventDefault();
    select(tabs[next].props.eventKey);
    listRef.current?.querySelectorAll<HTMLElement>('[role=tab]')[next]?.focus();
  };

  const id = (key: TabKey, part: string) => `${tabsId}-${part}-${key}`;
  const active = tabs.find(t => t.props.eventKey === current);

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        className={styles.list}
        onKeyDown={handleKeyDown}
      >
        {tabs.map(tab => {
          const { eventKey, title } = tab.props;
          const selected = eventKey === current;
          return (
            <button
              key={eventKey}
              type="button"
              role="tab"
              id={id(eventKey, 'tab')}
              aria-selected={selected}
              aria-controls={id(eventKey, 'panel')}
              tabIndex={selected ? 0 : -1}
              className={styles.tab}
              onClick={() => select(eventKey)}
            >
              {title}
            </button>
          );
        })}
      </div>
      {active && (
        <div
          role="tabpanel"
          id={id(active.props.eventKey, 'panel')}
          aria-labelledby={id(active.props.eventKey, 'tab')}
          className={styles.panel}
        >
          {active.props.children}
        </div>
      )}
    </div>
  );
};

export default Tabs;
