import { useSyncExternalStore } from "react"

export function createPersistedStore<T>(key: string, initial: T) {
    let value: T = initial
    try {
        const raw = window.localStorage.getItem(key)
        if (raw !== null) value = JSON.parse(raw) as T
    } catch {
        // sem localStorage: usa o valor inicial
    }
    const listeners = new Set<() => void>()

    function get(): T {
        return value
    }
    function set(next: T): void {
        value = next
        try {
            if (next === null || next === undefined) window.localStorage.removeItem(key)
            else window.localStorage.setItem(key, JSON.stringify(next))
        } catch {
            // ignorar falha de persistência
        }
        for (const listener of [...listeners]) listener()
    }
    function subscribe(listener: () => void) {
        listeners.add(listener)
        return () => {
            listeners.delete(listener)
        }
    }
    function useValue(): T {
        return useSyncExternalStore(subscribe, get, get)
    }
    return { get, set, subscribe, useValue }
}