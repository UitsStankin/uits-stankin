import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from 'react';

import { cn } from '@shared/lib/cn';

export interface MorphTabItem<K extends string> {
  key: K;
  label: string;
}

interface MorphTabsProps<K extends string> {
  items: readonly MorphTabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  label: string;
  mode?: 'tablist' | 'filter';
  idPrefix?: string;
  panelIdPrefix?: string;
  className?: string;
}

const MEASURE_SETTLE_MS = 30;

function measure(container: HTMLElement, instant: boolean): void {
  const active = container.querySelector<HTMLElement>('button[data-active="true"]');
  if (!active) return;

  if (instant) container.classList.add('u-no-anim');
  container.style.setProperty('--u-m-top', `${active.offsetTop}px`);
  container.style.setProperty('--u-m-left', `${active.offsetLeft}px`);
  container.style.setProperty(
    '--u-m-right',
    `${container.clientWidth - active.offsetLeft - active.offsetWidth}px`,
  );
  container.style.setProperty(
    '--u-m-bottom',
    `${container.clientHeight - active.offsetTop - active.offsetHeight}px`,
  );
  if (instant) {
    void container.offsetWidth;
    window.setTimeout(() => container.classList.remove('u-no-anim'), MEASURE_SETTLE_MS);
  }
}

export function MorphTabs<K extends string>({
  items,
  value,
  onChange,
  label,
  mode = 'tablist',
  idPrefix = 'tab',
  panelIdPrefix,
  className,
}: MorphTabsProps<K>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const placedRef = useRef(false);
  const isTablist = mode === 'tablist';

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    measure(container, !placedRef.current);
    placedRef.current = true;
  }, [value, items]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const remeasure = () => measure(container, true);
    const observer = 'ResizeObserver' in window ? new ResizeObserver(remeasure) : null;
    observer?.observe(container);
    void document.fonts?.ready.then(remeasure);

    return () => observer?.disconnect();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!isTablist) return;

    let target = -1;
    if (event.key === 'ArrowRight') target = (index + 1) % items.length;
    if (event.key === 'ArrowLeft') target = (index - 1 + items.length) % items.length;
    if (event.key === 'Home') target = 0;
    if (event.key === 'End') target = items.length - 1;
    if (target < 0) return;

    event.preventDefault();
    onChange(items[target].key);
    containerRef.current?.querySelectorAll<HTMLElement>('button')[target]?.focus();
  };

  return (
    <div
      ref={containerRef}
      role={isTablist ? 'tablist' : 'group'}
      aria-label={label}
      className={cn('u-tabs', !isTablist && 'u-filter', className)}
    >
      {items.map((item, index) => {
        const selected = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            className="u-tab"
            data-active={selected}
            onClick={() => onChange(item.key)}
            onKeyDown={(event) => onKeyDown(event, index)}
            {...(isTablist
              ? {
                  role: 'tab',
                  id: `${idPrefix}-${item.key}`,
                  'aria-selected': selected,
                  'aria-controls': panelIdPrefix ? `${panelIdPrefix}-${item.key}` : undefined,
                  tabIndex: selected ? 0 : -1,
                }
              : { 'aria-pressed': selected })}
          >
            {item.label}
          </button>
        );
      })}

      <div className="u-tabs-overlay" aria-hidden>
        {items.map((item) => (
          <span key={item.key} className="u-tab">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
