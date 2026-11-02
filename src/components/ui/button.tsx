import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border bg-clip-padding text-sm font-medium whitespace-nowrap outline-none select-none transition-colors duration-micro ease-out-soft disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-px aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "rounded-pill border-primary bg-primary text-primary-foreground shadow-part hover:brightness-110",
        outline:
          "rounded-pill border-rule bg-paper-2 text-ink shadow-part hover:bg-paper-3",
        secondary:
          "rounded-pill border-rule bg-secondary text-secondary-foreground hover:bg-paper-3",
        ghost:
          "rounded-part border-transparent hover:bg-muted hover:text-foreground",
        destructive:
          "rounded-pill border-destructive/40 bg-destructive/15 text-destructive hover:bg-destructive/25",
        link: "rounded-part border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 rounded-pill px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-pill px-3 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 rounded-pill px-5",
        icon: "size-9 rounded-part",
        "icon-xs": "size-6 rounded-part [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-part",
        "icon-lg": "size-10 rounded-part",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

import * as React from "react"

const Button = React.forwardRef<
  HTMLButtonElement,
  ButtonPrimitive.Props & VariantProps<typeof buttonVariants>
>(({ className, variant = "default", size = "default", ...props }, ref) => {
  return (
    <ButtonPrimitive
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
