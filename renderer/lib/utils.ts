import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 节流
export function throttle(fn: Function, delay: number) {
  let last = 0;
  return function (...args: any[]) {
    const now = Date.now();
    if (now - last > delay) {
      fn(...args);
      last = now;
    }
  };
}
