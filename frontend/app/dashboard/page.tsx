// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  HardHat,
  ReceiptText,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Inbox,
  IndianRupee,
  Search,
  RefreshCw,
  Eye,
  X,
  FileText,
  Image as ImageIcon,
  History,
  Printer,
} from "lucide-react";

// ==========================================
// INTERFACES
// ==========================================
interface PaymentMilestone {
  id: string;
  name: string;
  amount: number;
  status: string;
  paidAt?: string;
}

interface ProjectSite {
  id: string;
  siteName: string;
  location: string;
  state: string;
  civilStatus: string;
  structuralStatus: string;
  createdAt: string;
  milestones: PaymentMilestone[];
}

interface SiteImage {
  id: string;
  url: string;
  phase: string;
  createdAt: string;
  uploadedBy?: string;
}

interface ActivityLog {
  id: string;
  username: string;
  action: string;
  details: string;
  createdAt: string;
}

interface UserData {
  username: string;
  role: string;
}

export default function DashboardOverviewPage() {
  const [projects, setProjects] = useState<ProjectSite[]>([]);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "COMPLETED" | "ONGOING" | "PAYMENT_PENDING">("ALL");

  // Full Site Details Modal State
  const [selectedSite, setSelectedSite] = useState<ProjectSite | null>(null);
  const [modalTab, setModalTab] = useState<"BILLING" | "MEDIA" | "LOGS">("BILLING");
  const [siteImages, setSiteImages] = useState<SiteImage[]>([]);
  const [siteLogs, setSiteLogs] = useState<ActivityLog[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Fullscreen Image & Invoice Preview State
  const [viewFullscreenImage, setViewFullscreenImage] = useState<string | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);

  useEffect(() => {
    fetchRealTimeDashboard();
  }, []);

  const fetchRealTimeDashboard = async () => {
    setLoading(true);
    try {
      const [userRes, billingRes] = await Promise.all([
        fetch("http://localhost:5000/api/auth/me", { credentials: "include" }),
        fetch("http://localhost:5000/api/billing", { credentials: "include" }),
      ]);

      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
      }

      if (billingRes.ok) {
        const billingData = await billingRes.json();
        setProjects(billingData);
      }
    } catch (error) {
      console.error("Failed to load real-time dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  // Open Full Details Modal & Fetch Images + Logs
  const handleOpenSiteDetails = async (site: ProjectSite) => {
    setSelectedSite(site);
    setModalTab("BILLING");
    setDetailsLoading(true);
    try {
      const [imgRes, logRes] = await Promise.all([
        fetch(`http://localhost:5000/api/projects/${site.id}/images`),
        fetch(`http://localhost:5000/api/projects/${site.id}/logs`),
      ]);
      if (imgRes.ok) setSiteImages(await imgRes.json());
      if (logRes.ok) setSiteLogs(await logRes.json());
    } catch (error) {
      console.error("Failed to fetch site details:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  // ==========================================
  // MASTER CALCULATIONS
  // ==========================================
  const totalSites = projects.length;
  const civilCompleted = projects.filter((p) => p.civilStatus === "COMPLETED").length;
  const structuresDone = projects.filter(
    (p) => p.structuralStatus === "PANELS_MOUNTED" || p.structuralStatus === "COMPLETED"
  ).length;

  const workCompletedSites = projects.filter(
    (p) =>
      p.civilStatus === "COMPLETED" &&
      (p.structuralStatus === "PANELS_MOUNTED" || p.structuralStatus === "COMPLETED")
  ).length;

  let totalRevenue = 0;
  let totalReceived = 0;
  let fullyPaidSites = 0;
  let fullyCompletedSites = 0;
  let totalPaidInvoices = 0;

  let paid70Count = 0;
  let paid70Amount = 0;
  let paid30Count = 0;
  let paid30Amount = 0;
  let paidGstCount = 0;
  let paidGstAmount = 0;

  projects.forEach((site) => {
    const milestones = site.milestones || [];
    const hasMilestones = milestones.length > 0;
    const allPaid = hasMilestones && milestones.every((m) => m.status === "PAID");
    const isWorkDone =
      site.civilStatus === "COMPLETED" &&
      (site.structuralStatus === "PANELS_MOUNTED" || site.structuralStatus === "COMPLETED");

    if (allPaid) fullyPaidSites++;
    if (allPaid && isWorkDone) fullyCompletedSites++;

    milestones.forEach((m) => {
      totalRevenue += m.amount;
      if (m.status === "PAID") {
        totalReceived += m.amount;
        totalPaidInvoices++;
        if (m.name.includes("70%")) {
          paid70Count++;
          paid70Amount += m.amount;
        } else if (m.name.includes("30%")) {
          paid30Count++;
          paid30Amount += m.amount;
        } else if (m.name.includes("GST")) {
          paidGstCount++;
          paidGstAmount += m.amount;
        }
      }
    });
  });

  const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
  const collectionPct = pct(totalReceived, totalRevenue);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
  };

  // Sequence: 1. 70%, 2. 30%, 3. GST (Final)
  const sequenceMap: Record<string, number> = {
    "70% Payment (Advance & Material)": 1,
    "30% Payment (Installation & Commissioning)": 2,
    "GST Component (18%)": 3,
  };

  const getSortedMilestones = (milestones: PaymentMilestone[]) => {
    return [...(milestones || [])].sort((a, b) => (sequenceMap[a.name] || 99) - (sequenceMap[b.name] || 99));
  };

  const getMilestoneTag = (name: string) => {
    if (name.includes("70%")) return { label: "70% Advance", suffix: "70P" };
    if (name.includes("30%")) return { label: "30% Payment", suffix: "30P" };
    if (name.includes("GST")) return { label: "18% GST (Final)", suffix: "GST" };
    return { label: name, suffix: "INV" };
  };

  const filteredProjects = projects.filter((site) => {
    const matchesSearch =
      site.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.location.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const isWorkDone =
      site.civilStatus === "COMPLETED" &&
      (site.structuralStatus === "PANELS_MOUNTED" || site.structuralStatus === "COMPLETED");
    const allPaid = site.milestones?.length > 0 && site.milestones.every((m) => m.status === "PAID");

    if (filterStatus === "COMPLETED") return isWorkDone && allPaid;
    if (filterStatus === "ONGOING") return !isWorkDone;
    if (filterStatus === "PAYMENT_PENDING") return !allPaid;
    return true;
  });

  const getBadge = (status: string) => {
    const label = status?.replace(/_/g, " ") || "PENDING";
    const base = "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium capitalize ring-1 ring-inset whitespace-nowrap";
    if (status === "COMPLETED" || status === "PANELS_MOUNTED") {
      return (
        <span className={`${base} bg-emerald-50 text-emerald-700 ring-emerald-600/20`}>
          <CheckCircle2 size={13} aria-hidden /> {label.toLowerCase()}
        </span>
      );
    }
    if (status === "IN_PROGRESS" || status === "MATERIAL_ARRIVED" || status === "FRAME_FITTED") {
      return (
        <span className={`${base} bg-blue-50 text-blue-700 ring-blue-600/20`}>
          <Clock size={13} aria-hidden /> {label.toLowerCase()}
        </span>
      );
    }
    return (
      <span className={`${base} bg-slate-50 text-slate-600 ring-slate-500/20`}>
        <AlertCircle size={13} aria-hidden /> {label.toLowerCase()}
      </span>
    );
  };

  // Overall Site Status Badge (Replaces Collected / Total column)
  const getOverallStatusBadge = (site: ProjectSite) => {
    const isWorkDone =
      site.civilStatus === "COMPLETED" &&
      (site.structuralStatus === "PANELS_MOUNTED" || site.structuralStatus === "COMPLETED");
    const allPaid = site.milestones?.length > 0 && site.milestones.every((m) => m.status === "PAID");

    if (isWorkDone && allPaid) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 whitespace-nowrap">
          <CheckCircle2 size={13} /> 100% Completed
        </span>
      );
    }
    if (isWorkDone && !allPaid) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 whitespace-nowrap">
          <Clock size={13} /> Billing Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 whitespace-nowrap">
        <Clock size={13} /> Work Ongoing
      </span>
    );
  };

  const getMilestoneStatus = (milestones: PaymentMilestone[], keyword: string) => {
    return milestones?.find((m) => m.name.includes(keyword))?.status === "PAID";
  };

  const formatPhaseLabel = (phase: string) => {
    const labels: Record<string, string> = {
      "PHASE 1": "CIVIL MATERIAL",
      "PHASE 2": "COLUMNS",
      "PHASE 3": "CIVIL DOCS",
      "STRUCT_PHASE 1": "STRUCT MATERIAL",
      "STRUCT_PHASE 2": "FRAMES FITTED",
      "STRUCT_PHASE 3": "SOLAR PANELS",
      "STRUCT_PHASE 4": "STRUCT DOCS",
    };
    return labels[phase] || phase.replace("STRUCT_", "");
  };

  const civilSiteImages = siteImages.filter((img) => img.phase === "PHASE 1" || img.phase === "PHASE 2");
  const civilDocsImages = siteImages.filter((img) => img.phase === "PHASE 3");
  const structuralSiteImages = siteImages.filter(
    (img) => img.phase === "STRUCT_PHASE 1" || img.phase === "STRUCT_PHASE 2" || img.phase === "STRUCT_PHASE 3"
  );
  const structuralDocsImages = siteImages.filter((img) => img.phase === "STRUCT_PHASE 4");

  const Skeleton = ({ className = "" }: { className?: string }) => (
    <span className={`inline-block animate-pulse rounded bg-slate-200 ${className}`} />
  );

  const cardBase =
    "group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow";

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-1 pb-10">
      {/* MAIN DASHBOARD (HIDDEN ON PRINT) */}
      <div className="space-y-6 print:hidden">
        {/* ================= Header ================= */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Master Project Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              Welcome back, <span className="font-medium capitalize text-slate-800">{user?.username || "Admin"}</span>
              <span className="text-slate-400"> ({user?.role || "Administrator"})</span>. Click any site to view full photos, docs, and invoices.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchRealTimeDashboard}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden /> Refresh
            </button>
            <Link
              href="/dashboard/billing"
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Billing & Finance
            </Link>
            <Link
              href="/dashboard/projects"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              <Plus size={16} aria-hidden /> New Project
            </Link>
          </div>
        </header>

        {/* ================= 1. TOP MASTER KPI CARDS ================= */}
        <section aria-label="Master KPIs" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/dashboard/projects" className={cardBase}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Total / Completed Sites</p>
              <span className="rounded-lg bg-blue-50 p-2 text-blue-600"><MapPin size={18} /></span>
            </div>
            <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
              {loading ? <Skeleton className="h-8 w-20" /> : <>{workCompletedSites}<span className="text-lg font-medium text-slate-400"> / {totalSites}</span></>}
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-600">{fullyCompletedSites} sites 100% done (Work + Payment)</p>
          </Link>

          <Link href="/dashboard/billing" className={cardBase}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Total Payment Received</p>
              <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><IndianRupee size={18} /></span>
            </div>
            <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight text-emerald-700">
              {loading ? <Skeleton className="h-8 w-28" /> : formatCurrency(totalReceived)}
            </p>
            <p className="mt-1 text-xs text-slate-500">{collectionPct}% of total project value</p>
          </Link>

          {/* Replaced Outstanding Balance with Phase Invoices Ready */}
          <Link href="/dashboard/invoices" className={cardBase}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Phase Invoices Ready</p>
              <span className="rounded-lg bg-violet-50 p-2 text-violet-600"><FileText size={18} /></span>
            </div>
            <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight text-violet-700">
              {loading ? <Skeleton className="h-8 w-16" /> : totalPaidInvoices}
            </p>
            <p className="mt-1 text-xs text-slate-500">{fullyPaidSites} of {totalSites} sites 100% paid</p>
          </Link>

          <Link href="/dashboard/civil" className={cardBase}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Site Operations</p>
              <span className="rounded-lg bg-orange-50 p-2 text-orange-600"><HardHat size={18} /></span>
            </div>
            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Civil Done:</span>
                <span className="font-semibold tabular-nums text-slate-900">{loading ? "–" : `${civilCompleted} / ${totalSites}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Structures Done:</span>
                <span className="font-semibold tabular-nums text-slate-900">{loading ? "–" : `${structuresDone} / ${totalSites}`}</span>
              </div>
            </div>
          </Link>
        </section>

        {/* ================= 2. PAYMENT STAGE-WISE SUMMARY ================= */}
        <section aria-label="Payment Stage Breakdown" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Payment Stage-wise Summary (All Sites)
            </h2>
            <Link href="/dashboard/invoices" className="text-xs font-medium text-blue-600 hover:underline">
              Open Phase Invoices →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { title: "1. 70% Advance Payment", paidCount: paid70Count, amount: paid70Amount, color: "bg-blue-600", badge: "bg-blue-50 text-blue-700" },
              { title: "2. 30% Payment", paidCount: paid30Count, amount: paid30Amount, color: "bg-violet-600", badge: "bg-violet-50 text-violet-700" },
              { title: "3. 18% GST (Final)", paidCount: paidGstCount, amount: paidGstAmount, color: "bg-emerald-600", badge: "bg-emerald-50 text-emerald-700" },
            ].map((stage) => {
              const stagePct = pct(stage.paidCount, totalSites);
              return (
                <div key={stage.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">{stage.title}</p>
                    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${stage.badge}`}>
                      {loading ? "–" : `${stage.paidCount} / ${totalSites} Sites`}
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
                    {loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(stage.amount)}
                  </p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${stage.color} transition-[width] duration-500`} style={{ width: `${loading ? 0 : stagePct}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500 tabular-nums">
                    {stagePct}% sites paid · {totalSites - stage.paidCount} pending
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= 3. ALL PROJECTS MASTER TABLE ================= */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                All Projects Overview ({filteredProjects.length})
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Click any site row or &quot;Full Details&quot; to inspect photos, docs, invoices, and logs
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search site or location..."
                  className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none sm:w-56"
                />
              </div>

              <div className="flex flex-wrap gap-1">
                {[
                  { key: "ALL", label: "All" },
                  { key: "COMPLETED", label: "100% Done" },
                  { key: "ONGOING", label: "Work Ongoing" },
                  { key: "PAYMENT_PENDING", label: "Payment Pending" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilterStatus(f.key as any)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                      filterStatus === f.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                <tr className="whitespace-nowrap">
                  <th className="px-5 py-3 font-medium">Site & Location</th>
                  <th className="px-5 py-3 font-medium">Civil Status</th>
                  <th className="px-5 py-3 font-medium">Structure Status</th>
                  <th className="px-5 py-3 font-medium">Payment Stages</th>
                  <th className="px-5 py-3 font-medium">Overall Status</th>
                  <th className="px-5 py-3 text-right font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-4"><Skeleton className="h-4 w-36" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-6 w-24" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-6 w-24" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-6 w-36" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-6 w-28" /></td>
                      <td className="px-5 py-4"><Skeleton className="h-7 w-20 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center">
                      <Inbox size={28} className="mx-auto text-slate-300" />
                      <p className="mt-3 text-sm font-medium text-slate-700">No matching project sites found</p>
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((site) => {
                    const is70Paid = getMilestoneStatus(site.milestones, "70%");
                    const is30Paid = getMilestoneStatus(site.milestones, "30%");
                    const isGstPaid = getMilestoneStatus(site.milestones, "GST");

                    return (
                      <tr
                        key={site.id}
                        onClick={() => handleOpenSiteDetails(site)}
                        className="cursor-pointer transition-colors hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">{site.siteName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{site.location}</p>
                        </td>
                        <td className="px-5 py-4">{getBadge(site.civilStatus)}</td>
                        <td className="px-5 py-4">{getBadge(site.structuralStatus)}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${is70Paid ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                              70% {is70Paid ? "✓" : "–"}
                            </span>
                            <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${is30Paid ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                              30% {is30Paid ? "✓" : "–"}
                            </span>
                            <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${isGstPaid ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                              GST {isGstPaid ? "✓" : "–"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">{getOverallStatusBadge(site)}</td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSiteDetails(site);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 transition"
                          >
                            <Eye size={14} /> Full Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ================= Quick links ================= */}
        <nav aria-label="Quick links" className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/dashboard/civil" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            Civil works <ArrowUpRight size={14} />
          </Link>
          <Link href="/dashboard/structures" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            Structures <ArrowUpRight size={14} />
          </Link>
          <Link href="/dashboard/invoices" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            Invoices <ArrowUpRight size={14} />
          </Link>
        </nav>
      </div>

      {/* ===================================================================== */}
      {/* FULL SITE DOSSIER MODAL (PAYMENTS, INVOICES, PHOTOS, DOCS, LOGS)      */}
      {/* ===================================================================== */}
      {selectedSite && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-6 print:hidden">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 shrink-0">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {getBadge(selectedSite.civilStatus)}
                  {getBadge(selectedSite.structuralStatus)}
                  {getOverallStatusBadge(selectedSite)}
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900">{selectedSite.siteName}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin size={14} /> {selectedSite.location} ({selectedSite.state})
                </p>
              </div>
              <button
                onClick={() => setSelectedSite(null)}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex gap-2 border-b border-slate-200 bg-white px-6 py-3 shrink-0 overflow-x-auto">
              <button
                onClick={() => setModalTab("BILLING")}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                  modalTab === "BILLING" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <ReceiptText size={15} /> Payments & Invoices
              </button>
              <button
                onClick={() => setModalTab("MEDIA")}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                  modalTab === "MEDIA" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <ImageIcon size={15} /> Photos & Docs ({siteImages.length})
              </button>
              <button
                onClick={() => setModalTab("LOGS")}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                  modalTab === "LOGS" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <History size={15} /> Activity History ({siteLogs.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
              {detailsLoading ? (
                <div className="py-16 text-center text-sm font-semibold text-slate-500">Loading complete site data...</div>
              ) : modalTab === "BILLING" ? (
                /* TAB 1: PAYMENTS & SEPARATE INVOICES */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(() => {
                      const sTotal = selectedSite.milestones?.reduce((a, m) => a + m.amount, 0) || 0;
                      const sPaid = selectedSite.milestones?.filter((m) => m.status === "PAID").reduce((a, m) => a + m.amount, 0) || 0;
                      const paidPhases = selectedSite.milestones?.filter((m) => m.status === "PAID").length || 0;
                      const totalPhases = selectedSite.milestones?.length || 0;
                      return (
                        <>
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-medium text-slate-500">Total Project Value</p>
                            <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(sTotal)}</p>
                          </div>
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                            <p className="text-xs font-medium text-emerald-700">Total Received</p>
                            <p className="mt-1 text-xl font-bold text-emerald-700">{formatCurrency(sPaid)}</p>
                          </div>
                          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                            <p className="text-xs font-medium text-blue-700">Phases Paid</p>
                            <p className="mt-1 text-xl font-bold text-blue-700">{paidPhases} / {totalPhases} Phases</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Phase-wise Payments & Invoices</h3>
                    {getSortedMilestones(selectedSite.milestones).map((m, idx) => {
                      const { label, suffix } = getMilestoneTag(m.name);
                      const isPaid = m.status === "PAID";
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-4 ${
                            isPaid ? "border-emerald-200 bg-white" : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {idx + 1}. {m.name}
                            </p>
                            <p className="text-xs font-semibold text-slate-600 mt-0.5">
                              Amount: {formatCurrency(m.amount)}
                              {isPaid && m.paidAt && (
                                <span className="ml-2 text-emerald-600">
                                  • Paid on {new Date(m.paidAt).toLocaleDateString("en-GB")}
                                </span>
                              )}
                            </p>
                          </div>

                          {isPaid ? (
                            <button
                              onClick={() =>
                                setActiveInvoice({
                                  invoiceNo: `INV-2026-${selectedSite.id.slice(0, 4).toUpperCase()}-${suffix}`,
                                  invoiceTitle: `${label.toUpperCase()} INVOICE`,
                                  date: m.paidAt ? new Date(m.paidAt).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"),
                                  siteName: selectedSite.siteName,
                                  location: selectedSite.location,
                                  items: [{ description: m.name, qty: 1, rate: m.amount }],
                                  total: m.amount,
                                })
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                            >
                              <FileText size={14} /> View & Print Invoice
                            </button>
                          ) : (
                            <span className="inline-flex w-fit items-center gap-1 rounded-md bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                              <Clock size={12} /> Payment Pending
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : modalTab === "MEDIA" ? (
                /* TAB 2: ALL PHOTOS & DOCUMENTATION */
                <div className="space-y-8">
                  {[
                    { title: "Civil Works Progress Photos", list: civilSiteImages, color: "text-blue-700 bg-blue-50" },
                    { title: "Civil Documentation (Phase 3)", list: civilDocsImages, color: "text-blue-700 bg-blue-100" },
                    { title: "Structural & Solar Photos", list: structuralSiteImages, color: "text-purple-700 bg-purple-50" },
                    { title: "Structural Documentation (Phase 4)", list: structuralDocsImages, color: "text-purple-700 bg-purple-100" },
                  ].map((section) => (
                    <div key={section.title}>
                      <h3 className="mb-3 border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                        {section.title} ({section.list.length})
                      </h3>
                      {section.list.length === 0 ? (
                        <p className="text-xs italic text-slate-400">No files uploaded in this section yet.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {section.list.map((img) => (
                            <div key={img.id} className="rounded-xl border border-slate-200 bg-white p-2 group">
                              <div
                                onClick={() => setViewFullscreenImage(img.url)}
                                className="relative mb-2 h-28 cursor-pointer overflow-hidden rounded-lg bg-slate-100"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img.url} alt="Site Media" className="h-full w-full object-cover group-hover:scale-105 transition duration-300" />
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 group-hover:bg-slate-900/30 transition">
                                  <span className="rounded-full bg-white p-2 text-slate-800 opacity-0 group-hover:opacity-100 transition shadow">
                                    <Eye size={16} />
                                  </span>
                                </div>
                              </div>
                              <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase ${section.color}`}>
                                {formatPhaseLabel(img.phase)}
                              </span>
                              <p className="mt-1 truncate text-[10px] font-bold text-slate-700">By: {img.uploadedBy || "Admin"}</p>
                              <p className="text-[9px] text-slate-400">
                                {new Date(img.createdAt).toLocaleDateString("en-GB")}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* TAB 3: FULL ACTIVITY LOGS */
                <div className="space-y-3">
                  {siteLogs.length === 0 ? (
                    <p className="text-sm text-slate-500">No activity logs recorded for this site yet.</p>
                  ) : (
                    siteLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold uppercase text-blue-700">
                          {log.username.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm text-slate-800">
                            <span className="font-bold capitalize text-slate-900">{log.username}</span> {log.details}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {new Date(log.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* INVOICE PREVIEW & PRINT MODAL                                         */}
      {/* ===================================================================== */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4 backdrop-blur-sm overflow-y-auto print:static print:bg-white print:p-0">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl print:shadow-none">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 p-4 print:hidden">
              <span className="text-xs font-bold uppercase text-slate-600">{activeInvoice.invoiceTitle}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  <Printer size={15} /> Print / Save PDF
                </button>
                <button
                  onClick={() => setActiveInvoice(null)}
                  className="rounded-full border bg-white p-1.5 text-slate-500 hover:text-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-8 sm:p-10 text-slate-800">
              <div className="flex justify-between items-start border-b border-slate-200 pb-6 mb-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">SUNRAYS INDIA</h2>
                  <p className="text-xs text-slate-500 mt-1">Solar Energy Solutions & PM Suryaghar Yojana</p>
                  <p className="text-xs text-slate-500">Vadgaon Budruk, Pune, Maharashtra</p>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-bold text-blue-600">{activeInvoice.invoiceTitle}</h3>
                  <p className="text-xs font-bold text-slate-700 mt-1">{activeInvoice.invoiceNo}</p>
                  <p className="text-xs text-slate-500">Date: {activeInvoice.date}</p>
                </div>
              </div>

              <div className="mb-6 rounded-xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-xs font-bold uppercase text-slate-400">Billed To:</p>
                <h4 className="font-bold text-slate-900 mt-0.5">{activeInvoice.siteName}</h4>
                <p className="text-xs text-slate-600">{activeInvoice.location}</p>
              </div>

              <table className="w-full text-left border-collapse mb-6">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-xs font-bold uppercase text-slate-500">
                    <th className="py-3">Description</th>
                    <th className="py-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {activeInvoice.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-3 font-medium text-slate-900">{item.description}</td>
                      <td className="py-3 text-right font-bold text-slate-900">{formatCurrency(item.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end border-t border-slate-200 pt-4">
                <div className="w-64 flex justify-between text-base font-extrabold text-slate-900">
                  <span>Total Paid:</span>
                  <span>{formatCurrency(activeInvoice.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FULLSCREEN IMAGE LIGHTBOX                                             */}
      {/* ===================================================================== */}
      {viewFullscreenImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 p-4 backdrop-blur-sm print:hidden">
          <button
            onClick={() => setViewFullscreenImage(null)}
            className="absolute top-6 right-6 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          >
            <X size={24} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewFullscreenImage}
            alt="Fullscreen"
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}