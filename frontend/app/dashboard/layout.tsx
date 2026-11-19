// app/dashboard/layout.tsx
import { ReactNode } from "react";
import Sidebar from "../../components/sidebar";
import TopNav from "../../components/top-nav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar Component */}
      <Sidebar />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navigation Component */}
        <TopNav />

        {/* Dynamic Module Content (Projects, Civil, Structures etc.) */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}