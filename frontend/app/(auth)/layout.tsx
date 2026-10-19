import type { ReactNode } from "react";
import Image from "next/image";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Image src="/emblem.png" alt="Meghalaya Emblem" width={72} height={72} className="w-[72px] h-[72px]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">IT-Asset System</h1>
          <p className="text-sm text-gray-500 mt-1">IT Asset Management & Tracking</p>
        </div>
        {children}
      </div>
    </div>
  );
}
