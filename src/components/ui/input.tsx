import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "glass" | "floating"
  label?: string
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "default", label, error, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(false)
    
    const handleFocus = () => setFocused(true)
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false)
      setHasValue(e.target.value !== "")
      props.onBlur?.(e)
    }
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value !== "")
      props.onChange?.(e)
    }

    if (variant === "floating" && label) {
      return (
        <div className="relative">
          <input
            type={type}
            className={cn(
              "peer w-full rounded-xl border border-input bg-input/50 backdrop-blur-sm px-4 pt-6 pb-2 text-sm transition-all duration-300 ease-out",
              "placeholder-transparent",
              "focus:border-primary focus:bg-input/70 focus:shadow-medium focus:outline-none focus:ring-2 focus:ring-primary/20",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive focus:border-destructive focus:ring-destructive/20",
              className
            )}
            ref={ref}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            placeholder={label}
            {...props}
          />
          <label
            className={cn(
              "absolute left-4 top-4 text-sm text-muted-foreground transition-all duration-300 ease-out pointer-events-none",
              "peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-muted-foreground",
              "peer-focus:top-2 peer-focus:text-xs peer-focus:text-primary",
              (focused || hasValue) && "top-2 text-xs text-primary",
              error && "text-destructive peer-focus:text-destructive"
            )}
          >
            {label}
          </label>
          {error && (
            <p className="mt-1 text-xs text-destructive animate-fade-in-up">
              {error}
            </p>
          )}
        </div>
      )
    }

    if (variant === "glass") {
      return (
        <div className="relative">
          <input
            type={type}
            className={cn(
              "flex h-12 w-full rounded-xl border border-white/20 bg-white/10 backdrop-blur-glass px-4 py-3 text-sm transition-all duration-300 ease-out",
              "placeholder:text-muted-foreground/60",
              "focus:border-primary focus:bg-white/20 focus:shadow-glass focus:outline-none focus:ring-2 focus:ring-primary/20",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive focus:border-destructive focus:ring-destructive/20",
              className
            )}
            ref={ref}
            {...props}
          />
          {error && (
            <p className="mt-1 text-xs text-destructive animate-fade-in-up">
              {error}
            </p>
          )}
        </div>
      )
    }

    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-xl border border-input bg-input/70 backdrop-blur-sm px-4 py-2 text-sm transition-all duration-300 ease-out",
            "placeholder:text-muted-foreground/60",
            "focus:border-primary focus:bg-input/90 focus:shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus:border-destructive focus:ring-destructive/20",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-destructive animate-fade-in-up">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
