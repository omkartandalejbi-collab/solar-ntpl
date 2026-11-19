"use client";

import { useEffect, useState } from "react";
import {
  IndianRupee,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Download,
  ReceiptText,
  Building2,
  CreditCard,
  Calculator,
  Pencil,
  Check,
  Calendar,
  History,
  ArrowRight,
  Inbox,
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
  structuralStatus: string;
  createdAt: string;
  milestones: PaymentMilestone[];
}

interface ActivityLog {
  id: string;
  username: string;
  action: string;
  details: string;
  createdAt: string;
}

export default function BillingFinancePage() {
  const [projects, setProjects] = useState<ProjectSite[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals State
  const [selectedSite, setSelectedSite] = useState<ProjectSite | null>(null);
  const [setupSite, setSetupSite] = useState<ProjectSite | null>(null);
  const [baseAmountInput, setBaseAmountInput] = useState<string>("");

  // Logs State
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Inline Editing State
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");

  // Payment Confirmation State
  const [confirmMilestone, setConfirmMilestone] = useState<{ id: string; name: string; amount: number } | null>(null);

  // Print PDF State
  const [printSite, setPrintSite] = useState<ProjectSite | null>(null);

  // ==========================================
  // FETCH DATA
  // ==========================================
  useEffect(() => {
    fetchBillingData();
  }, []);

  // UI-only: close the top-most overlay with Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (confirmMilestone) setConfirmMilestone(null);
      else if (setupSite) setSetupSite(null);
      else if (selectedSite) setSelectedSite(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmMilestone, setupSite, selectedSite]);

  const fetchBillingData = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/billing", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Failed to fetch billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Logs for a specific project
  const fetchLogs = async (projectId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${projectId}/logs`);
      if (res.ok) {
        const data = await res.json();

        const paymentLogs = data.filter(
          (log: ActivityLog) => log.action === "PAYMENT_COLLECTED" || log.action === "BILLING_UPDATE"
        );

        setLogs(paymentLogs);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  };

  // ==========================================
  // ACTIONS
  // ==========================================

  // Row Click Handler (Opens Setup or Manage Modal)
  const handleRowClick = (site: ProjectSite, hasBilling: boolean) => {
    if (hasBilling) {
      setSelectedSite(site);
      fetchLogs(site.id);
    } else {
      setSetupSite(site);
    }
  };

  // 1. Setup New Billing from UI
  const handleSetupBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupSite || !baseAmountInput) return;

    try {
      const res = await fetch(`http://localhost:5000/api/billing/generate/${setupSite.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseAmount: Number(baseAmountInput) }),
        credentials: "include",
      });

      if (res.ok) {
        setSetupSite(null);
        setBaseAmountInput("");
        await fetchBillingData();
      }
    } catch (error) {
      console.error("Setup failed", error);
    }
  };

  // 2. Save Custom Amount Directly in DB
  const handleSaveAmount = async (milestoneId: string) => {
    if (!editAmount || isNaN(Number(editAmount))) return;

    try {
      const res = await fetch(`http://localhost:5000/api/billing/milestone/${milestoneId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(editAmount) }),
        credentials: "include",
      });

      if (res.ok) {
        setEditingMilestoneId(null);
        await fetchBillingData();
        if (selectedSite) fetchLogs(selectedSite.id);

        setSelectedSite((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            milestones: prev.milestones.map((m) => (m.id === milestoneId ? { ...m, amount: Number(editAmount) } : m)),
          };
        });
      }
    } catch (error) {
      console.error("Failed to update amount", error);
    }
  };

  // 3. Open Confirmation Modal
  const initiateCollectPayment = (m: PaymentMilestone) => {
    setConfirmMilestone({ id: m.id, name: m.name, amount: m.amount });
  };

  // 4. Mark Payment as PAID (After Confirmation)
  const confirmCollectPayment = async () => {
    if (!confirmMilestone) return;

    try {
      const res = await fetch(`http://localhost:5000/api/billing/collect/${confirmMilestone.id}`, {
        method: "PUT",
        credentials: "include",
      });
      if (res.ok) {
        await fetchBillingData();
        if (selectedSite) fetchLogs(selectedSite.id);

        setSelectedSite((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            milestones: prev.milestones.map((m) =>
              m.id === confirmMilestone.id ? { ...m, status: "PAID", paidAt: new Date().toISOString() } : m
            ),
          };
        });
        setConfirmMilestone(null);
      }
    } catch (error) {
      console.error("Payment failed", error);
    }
  };

  // 5. Generate Dynamic PDF
  const handleDownloadPDF = () => {
    if (!selectedSite) return;
    const hasPaid = selectedSite.milestones.some((m) => m.status === "PAID");
    if (!hasPaid) {
      alert("No payments received yet. Cannot generate statement.");
      return;
    }
    setPrintSite(selectedSite);
    setTimeout(() => {
      window.print();
      setPrintSite(null);
    }, 300);
  };

  // ==========================================
  // HELPERS & CALCULATIONS
  // ==========================================
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
  };

  // Global Summaries
  let totalRevenue = 0;
  let totalReceived = 0;

  projects.forEach((site) => {
    site.milestones.forEach((m) => {
      totalRevenue += m.amount;
      if (m.status === "PAID") totalReceived += m.amount;
    });
  });

  const totalOutstanding = totalRevenue - totalReceived;

  // Selected Site Summaries
  const siteTotal = selectedSite?.milestones.reduce((acc, m) => acc + m.amount, 0) || 0;
  const siteReceived = selectedSite?.milestones.filter((m) => m.status === "PAID").reduce((acc, m) => acc + m.amount, 0) || 0;
  const siteOutstanding = siteTotal - siteReceived;
  const siteStatus = siteReceived === 0 ? "PENDING" : siteReceived === siteTotal ? "PAID" : "PARTIAL";

  const getStatusBadge = (status: string) => {
    const base =
      "inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset";
    switch (status) {
      case "PAID":
        return (
          <span className={`${base} bg-emerald-50 text-emerald-700 ring-emerald-600/20`}>
            <CheckCircle2 size={13} aria-hidden /> Paid
          </span>
        );
      case "PARTIAL":
        return (
          <span className={`${base} bg-amber-50 text-amber-700 ring-amber-600/20`}>
            <Clock size={13} aria-hidden /> Partial
          </span>
        );
      case "NO_BILLING":
        return (
          <span className={`${base} bg-slate-50 text-slate-600 ring-slate-500/20`}>
            <Calculator size={13} aria-hidden /> Amount not set
          </span>
        );
      default:
        return (
          <span className={`${base} bg-rose-50 text-rose-700 ring-rose-600/20`}>
            <AlertCircle size={13} aria-hidden /> Payment pending
          </span>
        );
    }
  };

  const sequenceMap: Record<string, number> = {
    "70% Payment (Advance & Material)": 1,
    "30% Payment (Installation & Commissioning)": 2,
    "GST Component (18%)": 3,
  };

  const getSortedMilestones = (milestones: PaymentMilestone[]) => {
    return [...milestones].sort((a, b) => (sequenceMap[a.name] || 99) - (sequenceMap[b.name] || 99));
  };

  // Display-only helpers
  const getRowInfo = (site: ProjectSite) => {
    const hasBilling = site.milestones.length > 0;
    const sTotal = site.milestones.reduce((acc, m) => acc + m.amount, 0);
    const sReceived = site.milestones.filter((m) => m.status === "PAID").reduce((acc, m) => acc + m.amount, 0);
    const status = !hasBilling ? "NO_BILLING" : sReceived === 0 ? "PENDING" : sReceived === sTotal ? "PAID" : "PARTIAL";

    const completedMilestonesCount = site.milestones.filter(m => m.status === "PAID").length;
    const totalMilestonesCount = site.milestones.length;

    return { hasBilling, sTotal, sReceived, status, completedMilestonesCount, totalMilestonesCount };
  };

  const paymentPhaseBadge = (completed: number, total: number, hasBilling: boolean) => {
    if (!hasBilling) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
          Not initialized
        </span>
      );
    }
    if (completed === total && total > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 size={14} aria-hidden /> All phases paid
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
        <Clock size={14} aria-hidden /> {completed} of {total} paid
      </span>
    );
  };

  const sitePct = siteTotal > 0 ? Math.round((siteReceived / siteTotal) * 100) : 0;

  const Skeleton = ({ className = "" }: { className?: string }) => (
    <span className={`inline-block animate-pulse rounded bg-slate-200 ${className}`} />
  );

  // ==========================================
  // RENDER UI
  // ==========================================
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-1 pb-10">
      {/* --- MAIN DASHBOARD (HIDDEN ON PRINT) --- */}
      <div className="space-y-6 print:hidden">
        {/* ================= Header ================= */}
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
            <IndianRupee size={26} className="text-emerald-600" aria-hidden /> Billing and finance
          </h1>
          <p className="mt-1 text-sm text-slate-500">Set payable amounts, collect milestone payments, and download statements.</p>
        </header>

        {/* ================= KPI cards ================= */}
        <section aria-label="Totals" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Expected revenue</p>
              <span className="rounded-lg bg-blue-50 p-2 text-blue-600"><Building2 size={18} aria-hidden /></span>
            </div>
            <p className="mt-4 text-2xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
              {loading ? <Skeleton className="h-8 w-32" /> : formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Amount received</p>
              <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><CreditCard size={18} aria-hidden /></span>
            </div>
            <p className="mt-4 text-2xl font-semibold tabular-nums tracking-tight text-emerald-700 sm:text-3xl">
              {loading ? <Skeleton className="h-8 w-32" /> : formatCurrency(totalReceived)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Outstanding balance</p>
              <span className="rounded-lg bg-rose-50 p-2 text-rose-600"><ReceiptText size={18} aria-hidden /></span>
            </div>
            <p className="mt-4 text-2xl font-semibold tabular-nums tracking-tight text-rose-600 sm:text-3xl">
              {loading ? <Skeleton className="h-8 w-32" /> : formatCurrency(totalOutstanding)}
            </p>
          </div>
        </section>

        {/* ================= Sites ================= */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Project billing</h2>
            <p className="mt-0.5 text-xs text-slate-500">Select a site to set its amount or manage payments.</p>
          </div>

          {/* Mobile: card list */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {loading ? (
              [0, 1, 2].map((i) => (
                <li key={i} className="space-y-2 p-4">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </li>
              ))
            ) : projects.length === 0 ? (
              <li className="px-5 py-12 text-center">
                <Inbox size={28} className="mx-auto text-slate-300" aria-hidden />
                <p className="mt-3 text-sm font-medium text-slate-700">No sites to bill yet</p>
              </li>
            ) : (
              projects.map((site) => {
                const { hasBilling, sTotal, sReceived, status, completedMilestonesCount, totalMilestonesCount } = getRowInfo(site);
                return (
                  <li key={site.id}>
                    <button
                      type="button"
                      onClick={() => handleRowClick(site, hasBilling)}
                      className="flex w-full items-center gap-3 p-4 text-left active:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1 space-y-2.5">
                        <p className="break-words font-medium text-slate-900">{site.siteName}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          {getStatusBadge(status)}
                          {paymentPhaseBadge(completedMilestonesCount, totalMilestonesCount, hasBilling)}
                        </div>
                        {hasBilling && (
                          <div className="flex items-baseline justify-between text-sm tabular-nums">
                            <span className="text-slate-500">
                              Total <span className="font-semibold text-slate-900">{formatCurrency(sTotal)}</span>
                            </span>
                            <span className="text-slate-500">
                              Due <span className="font-semibold text-rose-600">{formatCurrency(sTotal - sReceived)}</span>
                            </span>
                          </div>
                        )}
                      </div>
                      <ArrowRight size={16} className="shrink-0 text-slate-300" aria-hidden />
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr className="whitespace-nowrap">
                  <th scope="col" className="px-5 py-3 font-medium">Project site</th>
                  <th scope="col" className="px-5 py-3 font-medium">Payment phases</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Total payable</th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">Outstanding</th>
                  <th scope="col" className="px-5 py-3 font-medium">Payment status</th>
                  <th scope="col" className="px-5 py-3"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {[36, 28, 24, 24, 28, 6].map((w, j) => (
                        <td key={j} className="px-5 py-4"><span className="inline-block h-4 animate-pulse rounded bg-slate-200" style={{ width: `${w * 4}px` }} /></td>
                      ))}
                    </tr>
                  ))
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <Inbox size={28} className="mx-auto text-slate-300" aria-hidden />
                      <p className="mt-3 text-sm font-medium text-slate-700">No sites to bill yet</p>
                      <p className="mt-1 text-xs text-slate-500">Sites from the project register will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  projects.map((site) => {
                    const { hasBilling, sTotal, sReceived, status, completedMilestonesCount, totalMilestonesCount } = getRowInfo(site);
                    return (
                      <tr
                        key={site.id}
                        onClick={() => handleRowClick(site, hasBilling)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleRowClick(site, hasBilling);
                          }
                        }}
                        tabIndex={0}
                        className="group cursor-pointer transition-colors hover:bg-slate-50/70 focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
                      >
                        <td className="px-5 py-4 font-medium text-slate-900">{site.siteName}</td>
                        <td className="px-5 py-4">{paymentPhaseBadge(completedMilestonesCount, totalMilestonesCount, hasBilling)}</td>
                        <td className="px-5 py-4 text-right font-medium tabular-nums text-slate-800">{hasBilling ? formatCurrency(sTotal) : "–"}</td>
                        <td className="px-5 py-4 text-right font-medium tabular-nums text-rose-600">{hasBilling ? formatCurrency(sTotal - sReceived) : "–"}</td>
                        <td className="px-5 py-4">{getStatusBadge(status)}</td>
                        <td className="px-5 py-4 text-right text-slate-300 transition group-hover:text-slate-500">
                          <ArrowRight size={16} className="ml-auto" aria-hidden />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ================= MODAL 1: SET PROJECT AMOUNT ================= */}
        {setupSite && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="setup-title"
          >
            <div className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl sm:border sm:border-slate-200">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <h3 id="setup-title" className="text-lg font-semibold text-slate-900">Set project amount</h3>
                  <p className="mt-0.5 break-words text-sm text-slate-500">Start billing for {setupSite.siteName}</p>
                </div>
                <button
                  onClick={() => setSetupSite(null)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSetupBilling} className="space-y-5 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6">
                <div>
                  <label htmlFor="base-amount" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Base project amount (₹)
                  </label>
                  <input
                    id="base-amount"
                    type="number"
                    inputMode="numeric"
                    required
                    min="1"
                    value={baseAmountInput}
                    onChange={(e) => setBaseAmountInput(e.target.value)}
                    placeholder="e.g. 2500000"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-3 text-lg font-semibold tabular-nums text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                  />
                  <p className="mt-1.5 text-xs text-slate-500">Milestones and GST will be generated from this amount.</p>
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                >
                  Generate billing
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= MODAL 2: MANAGE PAYMENTS & HISTORY ================= */}
        {selectedSite && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="billing-site-title"
          >
            <div className="flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:border sm:border-slate-200">
              {/* Header */}
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-8 sm:py-5">
                <div className="min-w-0">
                  <div className="mb-2">{getStatusBadge(siteStatus)}</div>
                  <h2 id="billing-site-title" className="break-words text-xl font-semibold tracking-tight text-slate-900 sm:truncate sm:text-2xl">
                    {selectedSite.siteName}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedSite(null)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto bg-slate-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-8">
                <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
                  {/* LEFT: milestones */}
                  <div className="w-full space-y-3 lg:w-1/2">
                    <h3 className="text-sm font-semibold text-slate-900">Payment milestones</h3>

                    {getSortedMilestones(selectedSite.milestones).map((m, idx) => (
                      <div
                        key={m.id}
                        className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                          m.status === "PAID" ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className={`text-sm font-medium ${m.status === "PAID" ? "text-emerald-800" : "text-slate-800"}`}>
                            {idx + 1}. {m.name}
                          </p>

                          {editingMilestoneId === m.id ? (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-500">₹</span>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                aria-label="Milestone amount"
                                className="w-32 rounded-lg border border-slate-300 px-2.5 py-2 text-base font-medium tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 sm:py-1.5 sm:text-sm"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveAmount(m.id)}
                                aria-label="Save amount"
                                className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => setEditingMilestoneId(null)}
                                aria-label="Cancel editing"
                                className="rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="mt-1 flex items-center gap-1.5">
                              <p className="text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(m.amount)}</p>
                              {m.status !== "PAID" && (
                                <button
                                  onClick={() => {
                                    setEditingMilestoneId(m.id);
                                    setEditAmount(m.amount.toString());
                                  }}
                                  className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
                                  aria-label="Edit amount"
                                  title="Edit amount"
                                >
                                  <Pencil size={14} />
                                </button>
                              )}
                            </div>
                          )}

                          {m.status === "PAID" && m.paidAt && (
                            <p className="mt-1 text-xs text-emerald-700">
                              Paid on {new Date(m.paidAt).toLocaleDateString("en-GB")}
                            </p>
                          )}
                        </div>

                        {m.status === "PAID" ? (
                          <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-emerald-100 px-2.5 py-1.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 size={14} aria-hidden /> Collected
                          </span>
                        ) : (
                          <button
                            onClick={() => initiateCollectPayment(m)}
                            className="w-full shrink-0 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:w-auto sm:py-2"
                          >
                            Collect payment
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* RIGHT: totals & history */}
                  <div className="w-full space-y-5 lg:w-1/2">
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <p className="text-sm text-slate-500">Balance payable</p>
                      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-4xl">
                        {formatCurrency(siteOutstanding)}
                      </p>

                      <div
                        className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100"
                        role="progressbar"
                        aria-valuenow={sitePct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label="Collected"
                      >
                        <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${sitePct}%` }} />
                      </div>
                      <p className="mt-1.5 text-xs tabular-nums text-slate-500">{sitePct}% collected</p>

                      <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                        <div>
                          <dt className="text-xs text-slate-500">Grand total</dt>
                          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(siteTotal)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Amount received</dt>
                          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-700">{formatCurrency(siteReceived)}</dd>
                        </div>
                      </dl>
                    </div>

                    <button
                      onClick={handleDownloadPDF}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <Download size={17} aria-hidden /> Download statement (PDF)
                    </button>

                    {/* Activity history */}
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <History size={15} className="text-slate-500" aria-hidden /> Recent activity
                      </h3>
                      <div className="max-h-60 space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
                        {logs.length === 0 ? (
                          <p className="text-sm text-slate-500">No activity recorded yet.</p>
                        ) : (
                          logs.map((log) => (
                            <div key={log.id} className="flex gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold uppercase text-slate-600">
                                {log.username.substring(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <p className="break-words text-sm leading-snug text-slate-700">
                                  <span className="font-semibold capitalize text-slate-900">{log.username}</span> {log.details}
                                </p>
                                <p className="mt-0.5 text-xs tabular-nums text-slate-400">
                                  {new Date(log.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL 3: CONFIRM PAYMENT ================= */}
        {confirmMilestone && (
          <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <div className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl sm:border sm:border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
                <h3 id="confirm-title" className="text-lg font-semibold text-slate-900">Confirm payment</h3>
                <button
                  onClick={() => setConfirmMilestone(null)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4 p-5 sm:p-6">
                <p className="text-sm text-slate-600">Record this payment as collected? Today’s date will be saved as the collection date.</p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">{confirmMilestone.name}</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{formatCurrency(confirmMilestone.amount)}</p>
                  <p className="mt-3 inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    <Calendar size={14} aria-hidden /> Collection date:{" "}
                    {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6">
                <button
                  onClick={() => setConfirmMilestone(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmCollectPayment}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                >
                  Confirm collection <CheckCircle2 size={16} aria-hidden />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- PRINTABLE PDF INVOICE (unchanged) --- */}
      {printSite && (
        <div className="hidden print:block fixed inset-0 bg-white z-[99999] p-10">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">SUNRAYS INDIA</h2>
              <p className="text-sm text-slate-600 mt-1 font-medium">Solar Engineering & PM Suryaghar Yojana</p>
              <p className="text-sm text-slate-600">Pune, Maharashtra</p>
            </div>
            <div className="text-right">
              <h3 className="text-2xl font-black text-slate-900">PAYMENT STATEMENT</h3>
              <p className="text-sm font-bold text-slate-600 mt-2">Date: {new Date().toLocaleDateString("en-GB")}</p>
            </div>
          </div>

          <div className="mb-10 p-6 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs font-bold uppercase text-slate-500 mb-1">Project Site / Client Details:</p>
            <h4 className="text-xl font-bold text-slate-900">{printSite.siteName}</h4>
            <p className="text-sm text-slate-700">{printSite.location}</p>
          </div>

          <table className="w-full text-left border-collapse mb-10">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="py-4 text-sm font-bold text-slate-600 uppercase">Paid Milestones / Description</th>
                <th className="py-4 text-sm font-bold text-slate-600 uppercase text-right">Amount Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {getSortedMilestones(printSite.milestones)
                .filter((m) => m.status === "PAID")
                .map((m, idx) => (
                  <tr key={idx}>
                    <td className="py-4">
                      <p className="font-bold text-slate-900">{m.name}</p>
                      <p className="text-xs text-emerald-600 font-bold mt-1">Paid on: {new Date(m.paidAt || "").toLocaleDateString("en-GB")}</p>
                    </td>
                    <td className="py-4 text-right font-bold text-slate-900 text-lg">{formatCurrency(m.amount)}</td>
                  </tr>
                ))}
            </tbody>
          </table>

          <div className="flex justify-end border-t-2 border-slate-900 pt-6">
            <div className="w-72 flex justify-between text-xl font-black text-slate-900">
              <span>Total Received:</span>
              <span>{formatCurrency(printSite.milestones.filter((m) => m.status === "PAID").reduce((acc, m) => acc + m.amount, 0))}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}