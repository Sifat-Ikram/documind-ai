"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
      router.replace("/dashboard");
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
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text">
          Create account
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          It takes less than a minute.
        </p>
      </div>

      {formError && (
        <div
          role="alert"
          className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error-text"
        >
          {formError}
        </div>
      )}

      <Input
        label="Name"
        autoComplete="name"
        value={values.name}
        onChange={(e) => update("name", e.target.value)}
        error={errors.name}
      />
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={(e) => update("email", e.target.value)}
        error={errors.email}
      />
      <PasswordInput
        label="Password"
        autoComplete="new-password"
        value={values.password}
        onChange={(e) => update("password", e.target.value)}
        error={errors.password}
        hint="At least 8 characters, with a letter and a number."
      />

      <Button type="submit" size="lg" className="w-full" loading={submitting}>
        Create account
      </Button>

      <p className="text-center text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-link hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
