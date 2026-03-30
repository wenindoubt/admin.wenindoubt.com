"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatPhoneAsYouType, toE164 } from "@/lib/phone";

type PhoneInputProps = Omit<
  React.ComponentProps<"input">,
  "onChange" | "value"
> & {
  /** Current value — either E.164 or user-typed partial */
  value?: string;
  /** Called with E.164 string (or empty string) on every change */
  onChange?: (value: string) => void;
  /** Called on blur */
  onBlur?: () => void;
};

/**
 * Phone number input with auto-formatting.
 * Displays formatted number as user types, stores E.164 internally.
 * Defaults to US (+1) when no country code is provided.
 */
export function PhoneInput({
  value = "",
  onChange,
  onBlur,
  ...props
}: PhoneInputProps) {
  const [display, setDisplay] = useState(() => formatPhoneAsYouType(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display when value changes externally (e.g. form reset, edit mode)
  useEffect(() => {
    setDisplay(formatPhoneAsYouType(value));
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const formatted = formatPhoneAsYouType(raw);
      setDisplay(formatted);

      // Send E.164 to form state if valid, otherwise send the raw digits
      const e164 = toE164(formatted);
      onChange?.(e164 ?? raw.replace(/\D/g, ""));
    },
    [onChange],
  );

  const handleBlur = useCallback(() => {
    // On blur, normalize display to clean formatted version
    if (display) {
      const e164 = toE164(display);
      if (e164) {
        setDisplay(formatPhoneAsYouType(e164));
        onChange?.(e164);
      }
    }
    onBlur?.();
  }, [display, onChange, onBlur]);

  return (
    <Input
      ref={inputRef}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="+1 (518) 867-2033"
      {...props}
    />
  );
}
