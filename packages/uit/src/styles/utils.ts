import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function composeGradient(base: string, gradient: string) {
  return `bg-gradient-to-r ${gradient} ${base}`;
}
