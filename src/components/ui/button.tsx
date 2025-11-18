import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-lg hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0 before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700",
        destructive:
          "bg-destructive text-destructive-foreground shadow-lg hover:shadow-destructive/30 hover:scale-[1.02] active:scale-[0.98] before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0 before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700",
        outline:
          "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50 hover:shadow-[0_0_15px_rgba(250,250,250,0.1)] active:scale-[0.97] transition-all duration-300",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md hover:scale-[1.02] active:scale-[0.97] before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/10 before:to-white/0 before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:scale-[1.02] active:scale-[0.97] transition-all duration-200",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80 transition-colors",
        invert:
          "bg-background text-foreground border-2 border-input shadow-sm hover:bg-accent hover:text-accent-foreground hover:shadow-[0_0_15px_rgba(250,250,250,0.1)] active:scale-[0.97]",
        gradient: "bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white shadow-lg hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] hover:scale-[1.03] active:scale-[0.98] bg-[length:200%_100%] bg-[position:0%] hover:bg-[position:100%] transition-[background-position,transform,box-shadow] duration-500",
        "gradient-success": "bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 text-white shadow-lg hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:scale-[1.03] active:scale-[0.98] bg-[length:200%_100%] bg-[position:0%] hover:bg-[position:100%] transition-[background-position,transform,box-shadow] duration-500",
        "gradient-error": "bg-gradient-to-r from-red-500 via-rose-500 to-red-500 text-white shadow-lg hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] hover:scale-[1.03] active:scale-[0.98] bg-[length:200%_100%] bg-[position:0%] hover:bg-[position:100%] transition-[background-position,transform,box-shadow] duration-500",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
