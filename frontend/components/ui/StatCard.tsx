import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color?: "blue" | "green" | "yellow" | "red" | "purple" | "indigo";
  href?: string;
}

const colorClasses = {
  blue: { bg: "bg-blue-50", icon: "text-blue-600", value: "text-blue-700" },
  green: { bg: "bg-green-50", icon: "text-green-600", value: "text-green-700" },
  yellow: { bg: "bg-yellow-50", icon: "text-yellow-600", value: "text-yellow-700" },
  red: { bg: "bg-red-50", icon: "text-red-600", value: "text-red-700" },
  purple: { bg: "bg-purple-50", icon: "text-purple-600", value: "text-purple-700" },
  indigo: { bg: "bg-indigo-50", icon: "text-indigo-600", value: "text-indigo-700" },
};

export function StatCard({ title, value, subtitle, icon: Icon, color = "blue", href }: StatCardProps) {
  const colors = colorClasses[color];

  const content = (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className={`mt-1 text-3xl font-bold ${colors.value}`}>{value}</p>
        {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
      </div>
      <div className={`${colors.bg} p-3 rounded-xl`}>
        <Icon className={`h-6 w-6 ${colors.icon}`} />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
        {content}
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      {content}
    </div>
  );
}
