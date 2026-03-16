import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strips markdown code fences from LLM output.
 * Handles ```typescript, ```tsx, ``` and trailing ``` with optional whitespace.
 */
export function stripCodeFence(text: string): string {
  return text
    .replace(/^```[a-zA-Z]*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}
