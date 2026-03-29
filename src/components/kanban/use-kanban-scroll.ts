"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const DRAG_THRESHOLD = 5;

export function useKanbanScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const scrollBy = useCallback((dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  }, []);

  // Click-and-drag to pan
  const didDrag = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el || e.button !== 0) return;
    // Don't capture when clicking inside a card — let links and DnD work
    if ((e.target as HTMLElement).closest("[data-rfd-draggable-id]")) return;
    isDragging.current = true;
    didDrag.current = false;
    dragStartX.current = e.clientX;
    dragScrollLeft.current = el.scrollLeft;
    el.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - dragStartX.current;
    if (Math.abs(dx) > DRAG_THRESHOLD) {
      didDrag.current = true;
      el.style.cursor = "grabbing";
    }
    if (didDrag.current) {
      el.scrollLeft = dragScrollLeft.current - dx;
    }
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false;
    const el = scrollRef.current;
    if (el) {
      el.style.cursor = "";
      el.releasePointerCapture(e.pointerId);
    }
  }, []);

  return {
    scrollRef,
    canScrollLeft,
    canScrollRight,
    scrollBy,
    didDrag,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
