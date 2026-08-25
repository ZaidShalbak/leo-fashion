"use client";

import * as React from "react";
import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/**
 * Password Input with a show/hide toggle — no existing pattern to reuse
 * (no eye-icon toggle anywhere in this codebase before this), shared by
 * LoginForm, SignUpForm, and ResetPasswordForm. `dir="ltr"` matches the
 * established "Latin/numeral-heavy fields stay LTR" convention used for
 * every other password/email input in this app.
 */
export function PasswordInput({
  className,
  toggleAriaLabel,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & {
  toggleAriaLabel: { show: string; hide: string };
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        dir="ltr"
        className={cn("pe-9", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? toggleAriaLabel.hide : toggleAriaLabel.show}
        className="text-muted-foreground hover:text-foreground absolute end-2 top-1/2 -translate-y-1/2"
      >
        {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </button>
    </div>
  );
}
