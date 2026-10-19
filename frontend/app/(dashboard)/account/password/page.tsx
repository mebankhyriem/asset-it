"use client";

import { useActionState, useEffect, useState } from "react";
import { changeOwnPassword, updateOwnProfile } from "@/app/actions/users";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { RoleBadge } from "@/components/ui/Badge";

export default function AccountPage() {
  const [profileState, profileAction, profilePending] = useActionState(updateOwnProfile, undefined);
  const [pwState, pwAction, pwPending] = useActionState(changeOwnPassword, undefined);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => setProfile(d.user));
  }, [profileState?.message]);

  const pErr = (f: string) => profileState?.errors?.[f]?.[0];
  const wErr = (f: string) => pwState?.errors?.[f]?.[0];

  return (
    <div>
      <PageHeader title="My Account" subtitle="Manage your profile and password" />

      <div className="space-y-6 max-w-xl">

        {/* Editable Profile */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Profile Information</h3>
            {profile && <RoleBadge role={profile.role} />}
          </div>

          {profileState?.message && !profileState.errors && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 font-medium">{profileState.message}</p>
            </div>
          )}

          {profile ? (
            <form action={profileAction} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  name="name"
                  defaultValue={profile.name ?? ""}
                  required
                  placeholder="Your full name"
                  error={pErr("name")}
                />
                <Input
                  label="Office ID Number"
                  name="employee_id"
                  defaultValue={profile.employee_id ?? ""}
                  required
                  placeholder="e.g. OFC-001"
                  error={pErr("employee_id")}
                />
              </div>

              <Input
                label="Email Address"
                name="email"
                type="email"
                defaultValue={profile.email ?? ""}
                required
                placeholder="your@email.com"
                error={pErr("email")}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Designation"
                  name="designation"
                  defaultValue={profile.designation ?? ""}
                  placeholder="e.g. Lab Technician"
                  error={pErr("designation")}
                />
                <Input
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  defaultValue={profile.phone ?? ""}
                  placeholder="+91-9876543210"
                  error={pErr("phone")}
                />
              </div>


              <Button type="submit" isPending={profilePending}>Save Changes</Button>
            </form>
          ) : (
            <div className="space-y-3 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-9 bg-gray-100 rounded-lg" />)}
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Change Password</h3>

          {pwState?.message && !pwState.errors && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 font-medium">{pwState.message}</p>
            </div>
          )}

          <form action={pwAction} className="space-y-4">
            <Input label="Current Password" name="current_password" type="password" required error={wErr("current_password")} placeholder="Your current password" />
            <Input label="New Password" name="new_password" type="password" required error={wErr("new_password")} placeholder="Min. 6 characters" />
            <Input label="Confirm New Password" name="confirm_password" type="password" required error={wErr("confirm_password")} placeholder="Repeat new password" />
            <Button type="submit" isPending={pwPending}>Change Password</Button>
          </form>
        </div>

      </div>
    </div>
  );
}
