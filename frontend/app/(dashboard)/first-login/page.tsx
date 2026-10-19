"use client";

import { useActionState } from "react";
import { setNewPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertCircle, KeyRound, ShieldCheck } from "lucide-react";

export default function FirstLoginPage() {
  const [state, action, isPending] = useActionState(setNewPassword, undefined);

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-100 p-2 rounded-lg">
            <KeyRound className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Set Your Password</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Welcome! Since this is your first login, please set a new password for your account.
        </p>

        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 mb-6">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
          <p>Choose a strong password you haven&apos;t used before. Minimum 8 characters.</p>
        </div>

        {state?.error && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {state.error}
          </div>
        )}

        <form action={action} className="space-y-4">
          <Input
            label="New Password"
            name="password"
            type="password"
            placeholder="Min. 8 characters"
            required
            autoComplete="new-password"
            autoFocus
          />
          <Input
            label="Confirm Password"
            name="confirm"
            type="password"
            placeholder="Repeat your password"
            required
            autoComplete="new-password"
          />
          <Button type="submit" isPending={isPending} className="w-full" size="lg">
            Save Password &amp; Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
