import React, { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, prefixIcon, suffixIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

    return (
      <div className="form-group">
        {label && (
          <label htmlFor={inputId} className="form-label">
            <span>{label}</span>
          </label>
        )}
        <div className="form-input-wrapper">
          {prefixIcon && <span className="form-input-prefix">{prefixIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={`form-input ${prefixIcon ? 'form-input-has-prefix' : ''} ${
              suffixIcon ? 'form-input-has-suffix' : ''
            } ${className}`}
            {...props}
          />
          {suffixIcon && <span className="form-input-suffix">{suffixIcon}</span>}
        </div>
        {error && <span className="form-error">{error}</span>}
        {hint && !error && <span className="form-hint">{hint}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options?: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, options, children, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

    return (
      <div className="form-group">
        {label && (
          <label htmlFor={selectId} className="form-label">
            <span>{label}</span>
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`form-input form-select ${className}`}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && <span className="form-error">{error}</span>}
        {hint && !error && <span className="form-hint">{hint}</span>}
      </div>
    );
  }
);
Select.displayName = 'Select';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className = '', id, ...props }, ref) => {
    const textareaId = id || (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

    return (
      <div className="form-group">
        {label && (
          <label htmlFor={textareaId} className="form-label">
            <span>{label}</span>
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`form-input form-textarea ${className}`}
          {...props}
        />
        {error && <span className="form-error">{error}</span>}
        {hint && !error && <span className="form-hint">{hint}</span>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
