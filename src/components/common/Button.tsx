import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'danger-ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode;
  isIconOnly?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  icon,
  isIconOnly = false,
  className = '',
  disabled,
  ...props
}) => {
  const effectiveLeftIcon = leftIcon || icon;
  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';
  const variantClass = variant === 'outline' ? 'btn-secondary' : `btn-${variant}`;
  const iconOnlyClass = isIconOnly ? 'btn-icon' : '';

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${iconOnlyClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 18} />
      ) : (
        <>
          {effectiveLeftIcon && <span className="btn-icon-wrapper">{effectiveLeftIcon}</span>}
          {children}
          {rightIcon && <span className="btn-icon-wrapper">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
