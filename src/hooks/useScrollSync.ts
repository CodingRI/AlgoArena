import { useEffect } from 'react';
import { SOCKET_EVENTS } from '@/constants';
import socketService from '@/websockets/socketService';

interface ScrollSyncPayload {
  target: string;
  topRatio: number;
  leftRatio: number;
}

export const PAGE_SCROLL_EVENT = 'algo-arena:page-scroll';

export interface PageScrollDetail {
  deltaTop: number;
  deltaLeft: number;
}

const DOCUMENT_TARGET = '@document';

function selectorFor(element: Element): string | null {
  if (
    element === document.documentElement ||
    element === document.body ||
    element === document.scrollingElement
  ) {
    return DOCUMENT_TARGET;
  }

  if (element.id) return `#${CSS.escape(element.id)}`;

  for (const attribute of ['data-testid', 'data-key', 'data-cy']) {
    const value = element.getAttribute(attribute);
    if (value) {
      const selector = `[${attribute}="${CSS.escape(value)}"]`;
      if (document.querySelectorAll(selector).length === 1) return selector;
    }
  }

  const path: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.body) {
    const tag = current.tagName.toLowerCase();
    const siblings = current.parentElement
      ? Array.from(current.parentElement.children).filter((child) => child.tagName === current!.tagName)
      : [];
    const index = siblings.indexOf(current) + 1;
    path.unshift(`${tag}:nth-of-type(${index})`);
    current = current.parentElement;
  }
  return path.length ? `body > ${path.join(' > ')}` : null;
}

function resolveTarget(target: string): Element | null {
  if (target === DOCUMENT_TARGET) return document.scrollingElement;
  try {
    return document.querySelector(target);
  } catch {
    return null;
  }
}

function scrollPayload(element: Element): ScrollSyncPayload | null {
  const selector = selectorFor(element);
  if (!selector) return null;

  const node = element as HTMLElement;
  const maxTop = Math.max(0, node.scrollHeight - node.clientHeight);
  const maxLeft = Math.max(0, node.scrollWidth - node.clientWidth);
  return {
    target: selector,
    topRatio: maxTop ? node.scrollTop / maxTop : 0,
    leftRatio: maxLeft ? node.scrollLeft / maxLeft : 0,
  };
}

/** Synchronizes window and nested LeetCode scroll containers during a presentation. */
export function useScrollSync(active: boolean, isPresenter: boolean) {
  useEffect(() => {
    if (!active) return;

    if (!isPresenter) {
      return socketService.on<ScrollSyncPayload>(SOCKET_EVENTS.SCROLL_SYNC, (payload) => {
        const target = resolveTarget(payload.target) as HTMLElement | null;
        if (!target) return;

        requestAnimationFrame(() => {
          const maxTop = Math.max(0, target.scrollHeight - target.clientHeight);
          const maxLeft = Math.max(0, target.scrollWidth - target.clientWidth);
          target.scrollTop = payload.topRatio * maxTop;
          target.scrollLeft = payload.leftRatio * maxLeft;
        });
      });
    }

    let lastSentAt = 0;
    let pending: ReturnType<typeof setTimeout> | null = null;
    let latestTarget: Element | null = null;
    const previousPositions = new WeakMap<Element, { top: number; left: number }>();
    if (document.scrollingElement) {
      previousPositions.set(document.scrollingElement, {
        top: document.scrollingElement.scrollTop,
        left: document.scrollingElement.scrollLeft,
      });
    }

    const sendLatest = () => {
      pending = null;
      if (!latestTarget) return;
      const payload = scrollPayload(latestTarget);
      if (payload) socketService.send(SOCKET_EVENTS.SCROLL_SYNC, payload);
      lastSentAt = Date.now();
    };

    const handleScroll = (event: Event) => {
      const target =
        event.target === document
          ? document.scrollingElement
          : event.target instanceof Element
            ? event.target
            : null;
      if (!target || target.getRootNode() instanceof ShadowRoot) return;

      const node = target as HTMLElement;
      const previous = previousPositions.get(target);
      if (previous) {
        const deltaTop = node.scrollTop - previous.top;
        const deltaLeft = node.scrollLeft - previous.left;
        if (deltaTop || deltaLeft) {
          window.dispatchEvent(
            new CustomEvent<PageScrollDetail>(PAGE_SCROLL_EVENT, {
              detail: { deltaTop, deltaLeft },
            }),
          );
        }
      }
      previousPositions.set(target, { top: node.scrollTop, left: node.scrollLeft });

      latestTarget = target;
      const remaining = 50 - (Date.now() - lastSentAt);
      if (remaining <= 0) {
        if (pending) clearTimeout(pending);
        sendLatest();
      } else if (!pending) {
        pending = setTimeout(sendLatest, remaining);
      }
    };

    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('scroll', handleScroll, true);
      if (pending) clearTimeout(pending);
    };
  }, [active, isPresenter]);
}
