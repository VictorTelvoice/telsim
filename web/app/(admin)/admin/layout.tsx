import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-black text-white">
      <aside className="w-64 border-r border-gray-800 p-4">Admin Sidebar</aside>
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
