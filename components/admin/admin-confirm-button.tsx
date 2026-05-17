"use client";

import { useRef, useState } from "react";

type AdminConfirmButtonProps = {
  children: React.ReactNode;
  confirmLabel?: string;
  className?: string;
  disabled?: boolean;
  title?: string;
};

export function AdminConfirmButton({
  children,
  confirmLabel = "确认",
  className = "",
  disabled = false,
  title,
}: AdminConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (!confirming) {
      event.preventDefault();
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), 3000);
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }

  return (
    <button
      className={className}
      type="submit"
      disabled={disabled}
      title={title}
      onClick={handleClick}
    >
      {confirming ? confirmLabel : children}
    </button>
  );
}
