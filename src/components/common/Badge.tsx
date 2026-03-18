import { HTMLAttributes, forwardRef } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--bg-card-hover)] text-[var(--text-secondary)]',
  success: 'bg-[var(--brand-green-primary)]/15 text-[var(--brand-green-primary)]',
  warning: 'bg-[var(--brand-orange)]/15 text-[var(--brand-orange)]',
  danger: 'bg-[var(--brand-red)]/15 text-[var(--brand-red)]',
  info: 'bg-[var(--brand-blue-primary)]/15 text-[var(--brand-blue-primary)]',
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'default', className = '', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center px-2.5 py-0.5 rounded-full
          text-xs font-medium
          ${variantStyles[variant]}
          ${className}
        `}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
