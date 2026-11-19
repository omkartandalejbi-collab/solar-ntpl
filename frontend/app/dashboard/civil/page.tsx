"use client";
 
import { useEffect, useState, useRef } from "react";
import {
  HardHat,
  MapPin,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Calendar,
  Image as ImageIcon,
  Plus,
  Loader2,
  ArrowRight,
  Lock,
  Eye,
  FileText,
  User,
  Inbox,
} from "lucide-react";
 
// ==========================================
// INTERFACES (unchanged)
// ==========================================
interface ProjectSite {
  id: string;
  siteName: string;
  location: string;
  state: string;
  civilStatus: string; // PENDING, IN_PROGRESS, COMPLETED
  createdAt: string;
}
 
interface SiteImage {
  id: string;
  url: string;
  phase: string;
  createdAt: string;
  uploadedBy?: string;
}
 
export default function CivilWorksPage() {
  const [projects, setProjects] = useState<ProjectSite[]>([]);
  const [loading, setLoading] = useState(true);
 
  const [selectedSite, setSelectedSite] = useState<ProjectSite | null>(null);
  const [activePhase, setActivePhase] = useState("PHASE 1");
  const [uploading, setUploading] = useState(false);
  const [galleryImages, setGalleryImages] = useState<SiteImage[]>([]);
 
  // Lightbox State for viewing large images
  const [viewImage, setViewImage] = useState<string | null>(null);
 
  const fileInputRef = useRef<HTMLInputElement>(null);
 
  useEffect(() => {
    fetchCivilProjects();
  }, []);
 
  // UI-only: close the top-most overlay with Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (viewImage) setViewImage(null);
      else if (selectedSite) setSelectedSite(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewImage, selectedSite]);
 
  // ---------- API calls & logic (unchanged) ----------
  const fetchCivilProjects = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };
 
  const fetchSiteImages = async (projectId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${projectId}/images`);
      if (response.ok) {
        const data = await response.json();
        setGalleryImages(data);
      }
    } catch (error) {
      console.error("Failed to fetch images:", error);
    }
  };
 
  const handleRowClick = (site: ProjectSite) => {
    setSelectedSite(site);
    // Open PHASE 1 for pending, PHASE 2 for in-progress, and keep it flexible for completed
    setActivePhase(site.civilStatus === "PENDING" ? "PHASE 1" : "PHASE 2");
    fetchSiteImages(site.id);
  };
 
  // Image Upload Logic
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, phase: string) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedSite) return;
 
    const currentPhaseImages = galleryImages.filter((img) => img.phase === phase);
    if (currentPhaseImages.length >= 4) {
      alert("Maximum 4 images allowed per phase!");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
 
    setUploading(true);
    const formData = new FormData();
    formData.append("siteImage", files[0]);
    formData.append("projectId", selectedSite.id);
    formData.append("phase", phase);
 
    try {
      const response = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include", // sends the cookie so backend knows WHO is uploading
      });
      if (response.ok) {
        const data = await response.json();
        setGalleryImages((prev) => [data.image, ...prev]);
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
 
  // Move to Next Stage Logic
  const handleMoveToNextStage = async () => {
    if (!selectedSite) return;
 
    let nextStatus = "IN_PROGRESS";
    if (selectedSite.civilStatus === "IN_PROGRESS") {
      nextStatus = "COMPLETED";
    }
 
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${selectedSite.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ civilStatus: nextStatus }),
        credentials: "include",
      });
 
      if (response.ok) {
        const updatedProject = await response.json();
 
        const updatedList = projects.map((p) => (p.id === selectedSite.id ? updatedProject : p));
        setProjects(updatedList);
        setSelectedSite(updatedProject);
 
        if (nextStatus === "IN_PROGRESS") {
          setActivePhase("PHASE 2");
        }
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };
 
  // ---------- Display helpers ----------
  const getCivilStatusBadge = (status: string) => {
    const base =
      "inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset";
    switch (status) {
      case "COMPLETED":
        return (
          <span className={`${base} bg-emerald-50 text-emerald-700 ring-emerald-600/20`}>
            <CheckCircle2 size={13} aria-hidden /> Completed
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className={`${base} bg-blue-50 text-blue-700 ring-blue-600/20`}>
            <Clock size={13} aria-hidden /> In progress
          </span>
        );
      default:
        return (
          <span className={`${base} bg-slate-50 text-slate-600 ring-slate-500/20`}>
            <AlertCircle size={13} aria-hidden /> Pending
          </span>
        );
    }
  };
 
  // Hide upload box if the phase is already completed
  const isUploadAllowed = (phase: string, status: string) => {
    if (phase === "PHASE 1" && status !== "PENDING") return false; // Phase 1 is done
    if (phase === "PHASE 2" && status === "COMPLETED") return false; // Phase 2 is done
    return true; // Allow documentation uploads anytime
  };
 
  const activePhaseImages = galleryImages.filter((img) => img.phase === activePhase);
 
  // At least ONE photo must be uploaded for the REQUIRED current phase
  let currentRequiredPhase = "PHASE 1";
  if (selectedSite?.civilStatus === "IN_PROGRESS") currentRequiredPhase = "PHASE 2";
 
  const hasRequiredPhotos = galleryImages.some((img) => img.phase === currentRequiredPhase);
 
  // Display-only
  const phaseTabs = [
    { key: "PHASE 1", label: "Material", short: "material" },
    { key: "PHASE 2", label: "Columns", short: "columns" },
    { key: "PHASE 3", label: "Documentation", short: "documents" },
  ];
  const activeTab = phaseTabs.find((t) => t.key === activePhase);
  const completedCount = projects.filter((p) => p.civilStatus === "COMPLETED").length;
 
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-1 pb-10">
      {/* ================= Header ================= */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
            <HardHat size={26} className="text-orange-600" aria-hidden /> Civil works
          </h1>
          <p className="mt-1 text-sm text-slate-500">Upload phase-wise photos, move sites through each stage, and track completion.</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>
            <span className="font-semibold tabular-nums text-slate-900">{projects.length}</span> sites
          </span>
          <span className="h-4 w-px bg-slate-200" aria-hidden />
          <span>
            <span className="font-semibold tabular-nums text-emerald-600">{completedCount}</span> completed
          </span>
        </div>
      </header>
 
      {/* ================= Sites table ================= */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Mobile: card list */}
        <ul className="divide-y divide-slate-100 md:hidden">
          {loading ? (
            [0, 1, 2].map((i) => (
              <li key={i} className="space-y-2 p-4">
                <span className="block h-4 w-40 animate-pulse rounded bg-slate-200" />
                <span className="block h-3 w-28 animate-pulse rounded bg-slate-200" />
              </li>
            ))
          ) : projects.length === 0 ? (
            <li className="px-5 py-12 text-center">
              <Inbox size={28} className="mx-auto text-slate-300" aria-hidden />
              <p className="mt-3 text-sm font-medium text-slate-700">No sites available</p>
            </li>
          ) : (
            projects.map((site) => (
              <li key={site.id}>
                <button
                  type="button"
                  onClick={() => handleRowClick(site)}
                  className="flex w-full items-center gap-3 p-4 text-left active:bg-slate-50"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="break-words font-medium text-slate-900">{site.siteName}</p>
                    <p className="flex items-start gap-1 text-xs text-slate-500">
                      <MapPin size={12} className="mt-0.5 shrink-0" aria-hidden /> {site.location}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {getCivilStatusBadge(site.civilStatus)}
                      <span className="text-xs tabular-nums text-slate-400">{new Date(site.createdAt).toLocaleDateString("en-GB")}</span>
                    </div>
                  </div>
                  <ArrowRight size={16} className="shrink-0 text-slate-300" aria-hidden />
                </button>
              </li>
            ))
          )}
        </ul>
 
        {/* Desktop: table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr className="whitespace-nowrap">
                <th scope="col" className="px-5 py-3 font-medium">Site</th>
                <th scope="col" className="px-5 py-3 font-medium">Location</th>
                <th scope="col" className="px-5 py-3 font-medium">Civil status</th>
                <th scope="col" className="px-5 py-3 font-medium">Added on</th>
                <th scope="col" className="px-5 py-3 text-right font-medium"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {[36, 44, 24, 20, 8].map((w, j) => (
                      <td key={j} className="px-5 py-4">
                        <span className="inline-block h-4 animate-pulse rounded bg-slate-200" style={{ width: `${w * 4}px` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <Inbox size={28} className="mx-auto text-slate-300" aria-hidden />
                    <p className="mt-3 text-sm font-medium text-slate-700">No sites available</p>
                    <p className="mt-1 text-xs text-slate-500">Sites added in the project register will appear here.</p>
                  </td>
                </tr>
              ) : (
                projects.map((site) => (
                  <tr
                    key={site.id}
                    onClick={() => handleRowClick(site)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleRowClick(site);
                      }
                    }}
                    tabIndex={0}
                    className="group cursor-pointer transition-colors hover:bg-slate-50/70 focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
                  >
                    <td className="px-5 py-4 font-medium text-slate-900">{site.siteName}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin size={14} className="shrink-0 text-slate-400" aria-hidden />
                        {site.location}
                      </div>
                    </td>
                    <td className="px-5 py-4">{getCivilStatusBadge(site.civilStatus)}</td>
                    <td className="whitespace-nowrap px-5 py-4 tabular-nums text-slate-500">
                      {new Date(site.createdAt).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-5 py-4 text-right text-slate-300 transition group-hover:text-slate-500">
                      <ArrowRight size={16} className="ml-auto" aria-hidden />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
 
      {/* ================= SITE MODAL ================= */}
      {selectedSite && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="civil-site-title"
        >
          <div className="flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:border sm:border-slate-200">
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-8 sm:py-5">
              <div className="min-w-0">
                <div className="mb-2">{getCivilStatusBadge(selectedSite.civilStatus)}</div>
                <h2 id="civil-site-title" className="break-words text-xl font-semibold tracking-tight text-slate-900 sm:truncate sm:text-2xl">
                  {selectedSite.siteName.replace(/\[.*?\]\s*/, "")}
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
                {/* Left: Overview */}
                <aside className="w-full space-y-3 lg:w-1/3">
                  <h3 className="mb-2 text-sm font-semibold text-slate-900">Project overview</h3>
 
                  {[
                    { icon: MapPin, tone: "bg-blue-50 text-blue-600", label: "Location", value: selectedSite.location, muted: false },
                    { icon: User, tone: "bg-slate-100 text-slate-500", label: "Site engineer", value: "Not assigned yet", muted: true },
                    {
                      icon: Calendar,
                      tone: "bg-emerald-50 text-emerald-600",
                      label: "Start date",
                      value: new Date(selectedSite.createdAt).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" }),
                      muted: false,
                    },
                  ].map((row) => (
                    <div key={row.label} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                      <div className={`shrink-0 rounded-lg p-2 ${row.tone}`}>
                        <row.icon size={18} aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">{row.label}</p>
                        <p className={`text-sm leading-snug ${row.muted ? "italic text-slate-400" : "font-medium text-slate-900"}`}>{row.value}</p>
                      </div>
                    </div>
                  ))}
                </aside>
 
                {/* Right: Media gallery + actions */}
                <div className="flex w-full flex-col lg:w-2/3">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <ImageIcon size={16} className="text-slate-500" aria-hidden /> Site media
                  </h3>
 
                  {/* Phase tabs */}
                  <div role="tablist" aria-label="Phase" className="mb-5 flex w-full gap-1 rounded-xl bg-slate-200/60 p-1 sm:inline-flex sm:w-fit">
                    {phaseTabs.map((tab) => {
                      // Phase 2 is locked if project is still PENDING
                      const isLocked = tab.key === "PHASE 2" && selectedSite.civilStatus === "PENDING";
                      const isActive = activePhase === tab.key;
                      return (
                        <button
                          key={tab.key}
                          role="tab"
                          aria-selected={isActive}
                          disabled={isLocked}
                          onClick={() => setActivePhase(tab.key)}
                          className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-medium transition sm:flex-none sm:px-4 sm:py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                            isActive
                              ? "bg-white text-slate-900 shadow-sm"
                              : isLocked
                              ? "cursor-not-allowed text-slate-400"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {isLocked && <Lock size={12} aria-hidden />}
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
 
                  {/* Gallery grid */}
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {/* Upload box (hidden if 4 images exist OR phase is completed) */}
                    {activePhaseImages.length < 4 && isUploadAllowed(activePhase, selectedSite.civilStatus) && (
                      <label className="group relative flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 text-center transition hover:border-blue-400 hover:bg-blue-50/50 focus-within:ring-2 focus-within:ring-blue-600">
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          onChange={(e) => handleImageUpload(e, activePhase)}
                          disabled={uploading}
                          ref={fileInputRef}
                        />
                        {uploading ? (
                          <div className="flex flex-col items-center">
                            <Loader2 size={24} className="mb-2 animate-spin text-blue-600" aria-hidden />
                            <span className="text-sm font-medium text-blue-600">Uploading…</span>
                          </div>
                        ) : (
                          <>
                            <span className="mb-2 rounded-full bg-blue-50 p-2 text-blue-600 transition group-hover:bg-blue-100">
                              <Plus size={22} aria-hidden />
                            </span>
                            <p className="text-sm font-medium text-slate-800">Upload photo</p>
                            <p className="mt-0.5 text-xs text-slate-500">{activeTab?.short}</p>
                          </>
                        )}
                      </label>
                    )}
 
                    {/* Image cards */}
                    {activePhaseImages.map((img) => (
                      <figure key={img.id} className="group flex min-h-[170px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <button
                          type="button"
                          onClick={() => setViewImage(img.url)}
                          aria-label="View photo fullscreen"
                          className="relative block flex-1 overflow-hidden bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt="Site progress" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 transition group-hover:bg-slate-900/30 group-hover:opacity-100">
                            <span className="rounded-full bg-white p-2 text-slate-800 shadow">
                              <Eye size={16} aria-hidden />
                            </span>
                          </span>
                        </button>
                        <figcaption className="flex items-start justify-between gap-2 border-t border-slate-100 p-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-slate-800">By {img.uploadedBy || "Admin"}</p>
                            <p className="mt-0.5 text-xs tabular-nums text-slate-400">
                              {new Date(img.createdAt).toLocaleDateString("en-GB")} ·{" "}
                              {new Date(img.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" aria-hidden />
                        </figcaption>
                      </figure>
                    ))}
                  </div>
 
                  <p className="mt-3 text-xs text-slate-500">
                    <span className="font-semibold tabular-nums text-slate-800">{activePhaseImages.length}</span> of 4 photos uploaded
                  </p>
 
                  {/* Action bar */}
                  <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="mb-1.5 text-xs text-slate-500">Current progress</p>
                      {getCivilStatusBadge(selectedSite.civilStatus)}
                    </div>
 
                    {activePhase === "PHASE 3" ? (
                      <div className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700">
                        <FileText size={16} aria-hidden /> Documentation is optional
                      </div>
                    ) : selectedSite.civilStatus !== "COMPLETED" ? (
                      <div className="flex w-full flex-col items-stretch sm:w-auto sm:items-end">
                        <button
                          onClick={handleMoveToNextStage}
                          disabled={!hasRequiredPhotos}
                          className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-medium shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
                            hasRequiredPhotos
                              ? "bg-slate-900 text-white hover:bg-slate-800"
                              : "cursor-not-allowed bg-slate-200 text-slate-400"
                          }`}
                        >
                          {selectedSite.civilStatus === "PENDING" ? "Complete material and start columns" : "Complete columns and finish civil"}
                          <ArrowRight size={16} aria-hidden />
                        </button>
 
                        {!hasRequiredPhotos && (
                          <p className="mt-2 text-xs text-rose-600">Upload at least 1 photo for this phase to continue.</p>
                        )}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
                        <CheckCircle2 size={16} aria-hidden /> Civil works completed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
 
      {/* ================= FULLSCREEN LIGHTBOX ================= */}
      {viewImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setViewImage(null)}
        >
          <button
            onClick={() => setViewImage(null)}
            aria-label="Close preview"
            className="absolute right-5 top-5 z-[101] rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20"
          >
            <X size={22} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewImage}
            alt="Fullscreen view"
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}