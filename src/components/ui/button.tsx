import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden group",
  {
    variants: {
      variant: {
        default:
          "bg-[#0f172a] text-white shadow-soft hover:shadow-medium hover:-translate-y-0.5 active:translate-y-0 active:shadow-soft",
        destructive:
          "bg-[#0f172a] text-white shadow-soft hover:shadow-medium hover:-translate-y-0.5 active:translate-y-0",
        outline:
          "border border-transparent bg-transparent text-foreground hover:bg-muted hover:text-foreground shadow-soft hover:shadow-medium hover:-translate-y-0.5 active:translate-y-0",
        secondary:
          "bg-transparent text-foreground hover:bg-muted hover:text-foreground shadow-soft hover:shadow-medium hover:-translate-y-0.5 active:translate-y-0",
        ghost: 
          "bg-transparent text-foreground hover:bg-muted hover:text-foreground hover:-translate-y-0.5 transition-all duration-200",
        link: 
          "text-foreground underline-offset-4 hover:underline hover:text-foreground/80 transition-colors duration-200",
        premium:
          "bg-[#0f172a] text-white shadow-premium hover:shadow-floating hover:-translate-y-1 active:translate-y-0 active:shadow-premium border border-white/20 backdrop-blur-sm",
        glass:
          "glass-card text-foreground hover:shadow-floating hover:-translate-y-1 active:translate-y-0",
        floating:
          "bg-[#0f172a] text-white shadow-floating hover:shadow-premium hover:-translate-y-2 active:-translate-y-1 border border-white/30 backdrop-blur-glass",
        admin:
          "bg-primary text-primary-foreground shadow-floating hover:shadow-medium hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-ring border-0",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {!asChild && (
          <>
            {/* Ripple effect overlay */}
            <span className="absolute inset-0 rounded-inherit opacity-0 group-active:opacity-20 group-active:animate-ping bg-white pointer-events-none" />
            
            {/* Shimmer effect for premium variants */}
            {(variant === "premium" || variant === "floating") && (
              <span className="absolute inset-0 rounded-inherit opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-shimmer pointer-events-none" />
            )}
          </>
        )}
        
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
