import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/*
 * Avatar (ReUI) — ปรับให้ใช้ @radix-ui/react-avatar ที่มีอยู่แล้ว (ไม่ติดตั้งแพ็กเกจ radix-ui ทั้งก้อนซ้ำ)
 * Root ไม่ตัดขอบ → วางป้ายสถานะ / ตัวบอก (indicator) ล้นมุมได้ · ภาพกับตัวอักษรแทนเป็นวงกลมเอง
 */

const avatarStatusVariants = cva('flex items-center rounded-full size-2 border-2 border-background', {
  variants: {
    variant: {
      online: 'bg-green-600',
      offline: 'bg-zinc-600 dark:bg-zinc-300',
      busy: 'bg-yellow-600',
      away: 'bg-blue-600',
    },
  },
  defaultVariants: {
    variant: 'online',
  },
})

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return <AvatarPrimitive.Root data-slot="avatar" className={cn('relative flex shrink-0 size-10', className)} {...props} />
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <div className={cn('relative overflow-hidden rounded-full', className)}>
      <AvatarPrimitive.Image data-slot="avatar-image" className="aspect-square h-full w-full object-cover" {...props} />
    </div>
  )
}

function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full border border-border bg-accent text-xs text-accent-foreground',
        className,
      )}
      {...props}
    />
  )
}

function AvatarIndicator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="avatar-indicator" className={cn('absolute flex size-6 items-center justify-center', className)} {...props} />
}

function AvatarStatus({ className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof avatarStatusVariants>) {
  return <div data-slot="avatar-status" className={cn(avatarStatusVariants({ variant }), className)} {...props} />
}

export { Avatar, AvatarFallback, AvatarImage, AvatarIndicator, AvatarStatus, avatarStatusVariants }
