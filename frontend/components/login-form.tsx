"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Loader2, ArrowRight } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 🚀 एक्सप्रेस बॅकएंडचा नवीन राऊट
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include", // कुकी सेव्ह करण्यासाठी अत्यंत आवश्यक!
      });

      const data = await res.json();

      if (res.ok && data.success) {
        router.push("/dashboard"); 
      } else {
        setError(data.error || "Invalid username or password!");
        setLoading(false);
      }
    } catch (err) {
      console.error("Login connection error:", err);
      setError("Failed to connect to backend server.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full mt-6">
      
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold rounded-xl text-center uppercase tracking-wide">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Username</label>
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            required 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin" // इथे फक्त admin टाकायचं आहे (admin@ntpl.com नाही)
            className="w-full pl-11 pr-4 py-3.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Password</label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="password" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full pl-11 pr-4 py-3.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-[#0f172a] hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 disabled:bg-slate-400 text-sm tracking-wide cursor-pointer"
      >
        {loading ? (
          <><Loader2 size={18} className="animate-spin" /> Verifying...</>
        ) : (
          <>Sign In to Workspace <ArrowRight size={18} /></>
        )}
      </button>
    </form>
  );
}