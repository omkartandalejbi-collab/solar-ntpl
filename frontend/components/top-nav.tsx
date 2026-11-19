"use client";

import { useEffect, useState } from "react";
import { Bell, ChevronRight, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

interface UserData {
  username: string;
  role: string;
}

export default function TopNav() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    // 🚀 Fetch current logged-in user from Express backend
    fetch("http://localhost:5000/api/auth/me", {
      credentials: "include", // Required to send the HTTP-only cookie
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Unauthorized");
      })
      .then((data) => setUser(data))
      .catch(() => {
        // If not logged in, redirect to login page
        router.push("/login");
      });
  }, [router]);

  // Logout Function
  const handleLogout = async () => {
    await fetch("http://localhost:5000/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.push("/login");
  };

  // Get initials for the avatar (e.g., "ram" -> "RA", "admin" -> "AD")
  const getInitials = (name?: string) => {
    if (!name) return "NT";
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 shrink-0">
      
      {/* Left side: Breadcrumb navigation */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="uppercase tracking-wider text-xs font-semibold">NTPL</span>
        <ChevronRight size={14} />
        <span className="uppercase tracking-wider text-xs font-semibold">Operations</span>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium">Workspace</span>
      </div>

      {/* Right side: Notifications, User Profile & Logout */}
      <div className="flex items-center gap-6">
        <button className="text-slate-400 hover:text-slate-600 transition-colors">
          <Bell size={20} />
        </button>
        
        <div className="flex items-center gap-3 border-l pl-6">
          {/* Dynamic Avatar */}
          <div className="bg-blue-100 text-blue-700 font-bold w-8 h-8 flex items-center justify-center rounded-full text-xs uppercase">
            {getInitials(user?.username)}
          </div>
          
          <div className="text-sm">
            {/* Dynamic Username */}
            <p className="font-semibold text-slate-900 leading-tight capitalize">
              {user?.username || "Loading..."}
            </p>
            {/* Dynamic Role */}
            <p className="text-slate-500 text-xs capitalize">
              {user?.role || "User"}
            </p>
          </div>

          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            title="Logout"
            className="ml-4 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

    </header>
  );
}