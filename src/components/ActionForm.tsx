"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "@/lib/actions/auth";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirmMessage?: string;
  onSuccess?: () => void;
};

export default function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  confirmMessage,
  onSuccess,
}: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  // Only fire success behavior after a real submission has completed,
  // not on initial mount.
  const submitted = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const hadError = state?.error;

  if (pending) submitted.current = true;

  useEffect(() => {
    if (!pending && submitted.current && !hadError) {
      submitted.current = false;
      if (resetOnSuccess) formRef.current?.reset();
      onSuccessRef.current?.();
    }
  }, [pending, hadError, resetOnSuccess]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {state?.error && (
        <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {state.error}
        </div>
      )}
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
