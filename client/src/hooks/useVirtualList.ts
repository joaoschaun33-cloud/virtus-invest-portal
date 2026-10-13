import { useEffect, useMemo, useRef, useState } from "react";

export type VirtualItem<T> = {
  index: number;
  item: T;
  offsetTop: number;
};

/**
 * High-performance virtualized list hook.
 * Renders only the items currently within the viewport (+ overscan),
 * reducing DOM nodes from hundreds down to ~15-20 elements.
 */
export function useVirtualList<T>({
  items,
  itemHeight = 64,
  overscan = 4,
}: {
  items: T[];
  itemHeight?: number;
  overscan?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const updateHeight = () => {
      setContainerHeight(container.clientHeight || 600);
    };

    updateHeight();
    container.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateHeight);

    return () => {
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  const totalHeight = items.length * itemHeight;

  const { startIndex, endIndex, virtualItems } = useMemo(() => {
    if (!items.length) {
      return { startIndex: 0, endIndex: 0, virtualItems: [] };
    }

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);

    const list: Array<VirtualItem<T>> = [];
    for (let i = start; i < end; i++) {
      list.push({
        index: i,
        item: items[i],
        offsetTop: i * itemHeight,
      });
    }

    return {
      startIndex: start,
      endIndex: end,
      virtualItems: list,
    };
  }, [items, scrollTop, itemHeight, overscan, containerHeight]);

  return {
    containerRef,
    virtualItems,
    totalHeight,
    startIndex,
    endIndex,
  };
}
