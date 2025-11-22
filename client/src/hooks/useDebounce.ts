import { useEffect, useState } from "react";

// хук принимает значение и задержку
// он возвращает значение, которое обновляется только спустя delay миллисекунд
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Устанавливаем таймер
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // если value изменилось до того, как таймер сработал,
    // мы очищаем предыдущий таймер и запускаем новый
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
