"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, PasswordInput } from "@/components/ui/input";
import { useAuth } from "@/context/auth-context";
import { ApiError, errorMessage } from "@/lib/api";
import { fieldErrors } from "@/lib/forms";
import { safeNextPath } from "@/lib/utils";
import { loginSchema } from "@/lib/validation";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field: "email" | "password", value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await login(parsed.data.email, parsed.data.password);
      router.replace(safeNextPath(params.get("next")));
    } catch (err) {
      setFormError(
        err instanceof ApiError && err.status === 401
          ? "Incorrect email or password."
          : errorMessage(err),
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-text">
          Log in
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Enter your email and password.
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
        label="Email"
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={(e) => update("email", e.target.value)}
        error={errors.email}
      />
      <PasswordInput
        label="Password"
        autoComplete="current-password"
        value={values.password}
        onChange={(e) => update("password", e.target.value)}
        error={errors.password}
      />

      <Button type="submit" size="lg" className="w-full" loading={submitting}>
        Log in
      </Button>

      <p className="text-center text-sm text-text-muted">
        No account yet?{" "}
        <Link
          href="/register"
          className="font-medium text-link hover:underline"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
