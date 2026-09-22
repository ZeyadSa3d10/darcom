import './FormField.css';

// Standard labeled field (website.md #52): label + required mark + input + error + hint.
// Never rely on placeholder text alone.
export default function FormField({
  id,
  label,
  required = false,
  error,
  hint,
  children,
}) {
  return (
    <div className="darcom-field">
      {label && (
        <label htmlFor={id}>
          {label}
          {required && <span className="required" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error && (
        <div className="field-error" role="alert">
          {error}
        </div>
      )}
      {!error && hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

// Maps backend errors[] ({ field, message }) to a { field: message } lookup.
export function mapFieldErrors(error) {
  const map = {};
  for (const e of error?.errors ?? []) {
    if (e.field && !map[e.field]) map[e.field] = e.message || e.Message;
  }
  return map;
}
