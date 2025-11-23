import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return debounce value', () => {
    const value = 'test';
    const { result } = renderHook(() => useDebounce(value, 500));

    expect(result.current).toBe(value);
  });

  it('should update value after delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 500 },
    });

    expect(result.current).toBe('initial');

    // меняем значение
    rerender({ value: 'changed', delay: 500 });

    // сразу значение не должно измениться
    expect(result.current).toBe('initial');

    // проматываем время
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // теперь должно обновиться
    expect(result.current).toBe('changed');
  });
});