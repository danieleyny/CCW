import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Primary = brass inlay with ink text + soft glow on hover
        default:
          "bg-brass text-brand-foreground font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)] hover:bg-brass-bright hover:shadow-[0_8px_30px_-10px_var(--brass-glow)]",
        // Ghost hairline
        outline:
          "border-hairline-strong bg-surface-2/40 text-foreground hover:bg-surface-3 hover:text-foreground aria-expanded:bg-surface-3",
        secondary:
          "border-hairline bg-surface-2 text-secondary-foreground hover:bg-surface-3 aria-expanded:bg-surface-3",
        ghost:
          "text-foreground hover:bg-surface-2 hover:text-foreground aria-expanded:bg-surface-2",
        destructive:
          "bg-destructive/12 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/30",
        // Tertiary = signal text link
        link: "text-signal underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-3 text-[0.8rem] [&_svg:not([class*='size-'])]:size-4",
        lg: "h-11 gap-2 px-6 text-[0.95rem]",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9",
        "icon-lg": "size-11",
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
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
