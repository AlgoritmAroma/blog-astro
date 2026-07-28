"use client";

import type { ButtonHTMLAttributes } from "react";

/** Submit button that asks for confirmation before letting the enclosing
 * form's server action fire — used for irreversible admin actions (delete). */
export default function ConfirmButton({
  confirmText,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { confirmText: string }) {
  return (
    <button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!confirm(confirmText)) {
          e.preventDefault();
        }
      }}
    />
  );
}
