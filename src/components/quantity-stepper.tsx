import { Minus, Plus } from "lucide-react"

interface Props {
    value: number
    min?: number
    max: number
    label: string
    disabled?: boolean
    onChange: (value: number) => void
}

export function QuantityStepper({ value, min = 1, max, label, disabled, onChange }: Props) {
    const button =
        "grid size-7 place-items-center rounded-full bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
    return (
        <div role="group" aria-label={label} className="flex items-center gap-2">
            <button type="button" className={button} aria-label="Diminuir quantidade" disabled={disabled || value <= min} onClick={() => onChange(value - 1)}>
                <Minus aria-hidden className="size-4" />
            </button>
            <output aria-live="polite" className="min-w-6 text-center font-bold">{value}</output>
            <button type="button" className={button} aria-label="Aumentar quantidade" disabled={disabled || value >= max} onClick={() => onChange(value + 1)}>
                <Plus aria-hidden className="size-4" />
            </button>
        </div>
    )
}