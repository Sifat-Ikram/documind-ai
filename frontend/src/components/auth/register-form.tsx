"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PasswordChecklist } from "@/components/auth/password-checklist";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { ApiError, errorMessage } from "@/lib/api";
import { fieldErrors, serverFieldErrors } from "@/lib/forms";
import { registerSchema } from "@/lib/validation";

type Field = "name" | "email" | "password";

export function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();

  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field: Field, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await register(parsed.data.name, parsed.data.email, parsed.data.password);
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ email: "An account with this email already exists." });
      } else if (err instanceof ApiError && err.errors?.length) {
        setErrors(serverFieldErrors(err.errors));
      } else {
        setFormError(errorMessage(err));
      }
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-text">
        Create your account
      </h1>
      <p className="mt-1.5 text-sm text-text-muted">
        It takes less than a minute. No email verification needed.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        {formError && (
          <div
            role="alert"
            className="rounded-md bg-error-soft px-4 py-3 text-sm text-error-text"
          >
            {formError}
          </div>
        )}

        <Input
          label="Name"
          autoComplete="name"
          placeholder="Your name"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          error={errors.name}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={(e) => update("email", e.target.value)}
          error={errors.email}
        />
        <div className="space-y-3">
          <PasswordInput
            label="Password"
            autoComplete="new-password"
            value={values.password}
            onChange={(e) => update("password", e.target.value)}
            error={errors.password}
          />
          <PasswordChecklist value={values.password} />
        </div>

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Create account
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-link hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
