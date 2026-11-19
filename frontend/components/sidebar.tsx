// components/sidebar.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  LayoutDashboard, Folder, MapPin, HardHat, Pickaxe, 
  ClipboardList, Camera, Package, Receipt, IndianRupee, 
  Users, FileText, LogOut 
} from "lucide-react";

export default function Sidebar() {
  const router = useRouter();

  // 🚀 Sign out handler
  const handleLogout = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/auth/logout", {
        method: "POST",
        credentials: "include", // Required to clear the HTTP-only cookie
      });

      if (res.ok) {
        router.push("/login"); // Redirect to login page after clearing cookie
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <aside className="w-64 bg-[#0f172a] text-slate-300 flex flex-col h-full overflow-y-auto hidden md:flex shrink-0">
      
      {/* Brand Logo Section */}
      <div className="flex items-center gap-3 p-6 border-b border-slate-800">
        <div className="bg-slate-800 text-white font-bold w-10 h-10 flex items-center justify-center rounded">
          NT
        </div>
        <div>
          <h2 className="text-white font-bold text-sm tracking-wide">NTPL</h2>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">Project Operations</p>
        </div>
      </div>

      {/* Navigation Menus */}
      <nav className="flex-1 px-4 py-6 space-y-8 text-sm">
        
        <div>
          <p className="text-[10px] uppercase text-slate-500 font-semibold tracking-widest mb-3 px-2">Workspace</p>
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 hover:text-white transition-colors">
            <LayoutDashboard size={18} /> Overview
          </Link>
        </div>

        <div>
          <p className="text-[10px] uppercase text-slate-500 font-semibold tracking-widest mb-3 px-2">Projects</p>
          <ul className="space-y-1">
            <li><Link href="/dashboard/projects" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 hover:text-white transition-colors"><Folder size={18} /> Projects Data</Link></li>
            <li><Link href="/dashboard/civil" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 hover:text-white transition-colors"><HardHat size={18} /> Civil works</Link></li>
            <li><Link href="/dashboard/structures" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 hover:text-white transition-colors"><Pickaxe size={18} /> Structures</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-[10px] uppercase text-slate-500 font-semibold tracking-widest mb-3 px-2">Billing & Invoices</p>
          <ul className="space-y-1">
            <li><Link href="/dashboard/billing" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 hover:text-white transition-colors"><Folder size={18} /> Billing</Link></li>
            <li><Link href="/dashboard/invoices" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 hover:text-white transition-colors"><FileText size={18} /> Invoices</Link></li>
          </ul>
        </div>

      </nav>
      
      {/* Sign Out Button */}
      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full text-left text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors text-sm cursor-pointer"
        >
          <LogOut size={18} /> Sign out
        </button>
      </div>
    </aside>
  );
}