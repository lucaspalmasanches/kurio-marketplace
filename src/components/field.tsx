import { Eye, EyeOff } from "lucide-react"
import {
    useId,
    useState,
    type InputHTMLAttributes,
    type ReactNode,
    type SelectHTMLAttributes,
    type TextareaHTMLAttributes,
} from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface BaseProps {
    label: string
    error?: string
    required?: boolean
    className?: string
}

const control =
    "w-full rounded-[5px] border border-border bg-surface-card px-3 text-sm text-foreground placeholder:text-text-secondary aria-[invalid=true]:border-destructive"

function Header({ htmlFor, label, required }: { htmlFor: string; label: string; required?: boolean }) {
    return (
        <Label htmlFor={htmlFor} className="text-sm font-normal text-foreground">
            {label}
            {required && <span aria-hidden="true" className="text-primary">*</span>}
        </Label>
    )
}

function ErrorText({ id, error }: { id: string; error?: string }) {
    return error ? <p id={id} className="text-sm text-destructive">{error}</p> : null
}

type FieldProps = BaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "required"> & { trailing?: ReactNode }

export function Field({ label, error, required, className, id, trailing, ...props }: FieldProps) {
    const auto = useId()
    const fieldId = id ?? auto
    const errorId = `${fieldId}-erro`
    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            <Header htmlFor={fieldId} label={label} required={required} />
            <div className="relative">
                <Input
                    id={fieldId}
                    aria-required={required || undefined}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    className={cn(control, "h-10", trailing && "pr-10", props.readOnly && "opacity-80")}
                    {...props}
                />
                {trailing && <div className="absolute inset-y-0 right-2 flex items-center">{trailing}</div>}
            </div>
            <ErrorText id={errorId} error={error} />
        </div>
    )
}

export function PasswordField(props: Omit<FieldProps, "type" | "trailing">) {
    const [visible, setVisible] = useState(false)
    return (
        <Field
            {...props}
            type={visible ? "text" : "password"}
            trailing={
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={visible}
                    className="grid size-7 place-items-center rounded text-text-secondary hover:text-foreground"
                >
                    {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
                </button>
            }
        />
    )
}

type SelectProps = BaseProps &
    Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "required"> & { options: { value: string; label: string }[] }

export function SelectField({ label, error, required, className, id, options, ...props }: SelectProps) {
    const auto = useId()
    const fieldId = id ?? auto
    const errorId = `${fieldId}-erro`
    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            <Header htmlFor={fieldId} label={label} required={required} />
            <select
                id={fieldId}
                aria-required={required || undefined}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={cn(control, "h-10")}
                {...props}
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <ErrorText id={errorId} error={error} />
        </div>
    )
}

type TextAreaProps = BaseProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "required">

export function TextAreaField({ label, error, required, className, id, ...props }: TextAreaProps) {
    const auto = useId()
    const fieldId = id ?? auto
    const errorId = `${fieldId}-erro`
    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            <Header htmlFor={fieldId} label={label} required={required} />
            <textarea
                id={fieldId}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={cn(control, "min-h-28 py-2")}
                {...props}
            />
            <ErrorText id={errorId} error={error} />
        </div>
    )
}