import { clsx, type ClassValue } from "clsx"
import log from "electron-log/renderer";
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
    } else {
      log.debug("throttled");
    }
  };
}

// 防抖
export function debounce(fn: Function, delay: number) {
  let timer: NodeJS.Timeout;
  return function (...args: any[]) {
    if (timer) {
      log.debug("debounced");
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}