import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function generateId(): string {
    return Math.random().toString(36).substring(2, 11)
}

export function formatDateRange(from: Date | null, to: Date | null): string {
    if (!from || !to) return "New Trip"
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${from.toLocaleDateString('en-US', options)} - ${to.toLocaleDateString('en-US', options)}`
}
