"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  MapPin,
  Calendar,
  X,
  Building,
  Hash,
  HardHat,
  Wrench,
  Eye,
  FileText,
  Inbox,
  type LucideIcon,
} from "lucide-react";

interface ProjectSite {
  id: string;
  siteName: string;
  location: string;
  state: string;
  civilStatus: string;
  structuralStatus: string;
  createdAt: string;
}

interface SiteImage {
  id: string;
  url: string;
  phase: string;
  createdAt: string;
  uploadedBy?: string;
}

export default function ProjectsModulePage() {
  const [projects, setProjects] = useState<ProjectSite[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    siteName: "",
    projectId: "",
    location: "",
    taluka: "",
    district: "",
    state: "Maharashtra",
  });

  const [viewSite, setViewSite] = useState<ProjectSite | null>(null);
  const [siteImages, setSiteImages] = useState<SiteImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [viewFullscreenImage, setViewFullscreenImage] = useState<string | null>(null);

  // UI-only: search text for filtering the table
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  // UI-only: close the top-most overlay with Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (viewFullscreenImage) setViewFullscreenImage(null);
      else if (viewSite) setViewSite(null);
      else if (showModal) setShowModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewFullscreenImage, viewSite, showModal]);

  // ---------- API calls (unchanged) ----------
  const fetchProjects = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/projects", {
        credentials: "include",
      });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fullLocation = `${formData.location}, Taluka: ${formData.taluka}, Dist: ${formData.district}`;

      const response = await fetch("http://localhost:5000/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName: `[${formData.projectId}] ${formData.siteName}`,
          location: fullLocation,
          state: formData.state,
        }),
        credentials: "include",
      });

      if (response.ok) {
        const newSite = await response.json();
        setProjects([newSite, ...projects]);
        setShowModal(false);
        setFormData({
          siteName: "",
          projectId: "",
          location: "",
          taluka: "",
          district: "",
          state: "Maharashtra",
        });
      }
    } catch (error) {
      console.error("Failed to create site:", error);
    }
  };

  const handleViewDetails = async (site: ProjectSite) => {
    setViewSite(site);
    setImagesLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/projects/${site.id}/images`);
      if (res.ok) {
        const data = await res.json();
        setSiteImages(data);
      }
    } catch (error) {
      console.error("Failed to fetch images", error);
    } finally {
      setImagesLoading(false);
    }
  };

  // ---------- Display helpers ----------
  const getStatusBadge = (status: string) => {
    const label = (status?.replace(/_/g, " ") || "PENDING").toLowerCase();
    const base =
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium capitalize ring-1 ring-inset";
    if (status === "COMPLETED" || status === "PANELS_MOUNTED" || status === "FRAME_FITTED") {
      return (
        <span className={`${base} bg-emerald-50 text-emerald-700 ring-emerald-600/20`}>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {label}
        </span>
      );
    }
    if (status === "IN_PROGRESS" || status === "MATERIAL_ARRIVED") {
      return (
        <span className={`${base} bg-blue-50 text-blue-700 ring-blue-600/20`}>
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> {label}
        </span>
      );
    }
    return (
      <span className={`${base} bg-slate-50 text-slate-600 ring-slate-500/20`}>
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> {label}
      </span>
    );
  };

  // Separating Civil Photos and Civil Docs
  const civilSiteImages = siteImages.filter((img) => img.phase === "PHASE 1" || img.phase === "PHASE 2");
  const civilDocsImages = siteImages.filter((img) => img.phase === "PHASE 3");

  // Separating Structural Photos and Structural Docs
  const structuralSiteImages = siteImages.filter(
    (img) => img.phase === "STRUCT_PHASE 1" || img.phase === "STRUCT_PHASE 2" || img.phase === "STRUCT_PHASE 3"
  );
  const structuralDocsImages = siteImages.filter((img) => img.phase === "STRUCT_PHASE 4");

  const formatPhaseLabel = (phase: string) => {
    const labels: Record<string, string> = {
      "PHASE 1": "Civil material",
      "PHASE 2": "Columns",
      "PHASE 3": "Civil documentation",
      "STRUCT_PHASE 1": "Struct material",
      "STRUCT_PHASE 2": "Frames fitted",
      "STRUCT_PHASE 3": "Solar panels",
      "STRUCT_PHASE 4": "Struct documentation",
    };
    return labels[phase] || phase.replace("STRUCT_", "");
  };

  const q = search.trim().toLowerCase();
  const filteredProjects = q
    ? projects.filter((p) => p.siteName?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q))
    : projects;

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20";
  const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

  // ---------- Reusable media section ----------
  const MediaSection = ({
    title,
    icon: Icon,
    iconClass,
    images,
    emptyText,
    alt,
    docsLabel,
  }: {
    title: string;
    icon: LucideIcon;
    iconClass: string;
    images: SiteImage[];
    emptyText: string;
    alt: string;
    docsLabel?: string;
  }) => (
    <section>
      <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Icon className={iconClass} size={18} aria-hidden /> {title}
        </h3>
        <span className="text-xs tabular-nums text-slate-500">{images.length} {images.length === 1 ? "file" : "files"}</span>
      </div>
      {images.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
          {emptyText}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <figure key={img.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setViewFullscreenImage(img.url)}
                className="relative block w-full overflow-hidden bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
                aria-label={`Open ${alt} fullscreen`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={alt} className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 transition group-hover:bg-slate-900/30 group-hover:opacity-100">
                  <span className="rounded-full bg-white p-2 text-slate-800 shadow">
                    <Eye size={16} aria-hidden />
                  </span>
                </span>
              </button>
              <figcaption className="space-y-0.5 p-3">
                <p className="text-xs font-semibold text-slate-800">{docsLabel || formatPhaseLabel(img.phase)}</p>
                <p className="truncate text-xs text-slate-500">By {img.uploadedBy || "Admin"}</p>
                <p className="text-xs tabular-nums text-slate-400">
                  {new Date(img.createdAt).toLocaleDateString("en-GB")} ·{" "}
                  {new Date(img.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-1 pb-10">
      {/* ================= Header ================= */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Project sites</h1>
          <p className="mt-1 text-sm text-slate-500">Track every site, its civil and structural progress, and site photos.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:w-auto"
        >
          <Plus size={16} aria-hidden /> Add new site
        </button>
      </header>

      {/* ================= Table card ================= */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by site name or location"
              aria-label="Search sites"
              className={`${inputClass} pl-9`}
            />
          </div>
          <p className="text-sm text-slate-500">
            {q ? (
              <>
                Showing <span className="font-semibold tabular-nums text-slate-900">{filteredProjects.length}</span> of {projects.length} sites
              </>
            ) : (
              <>
                <span className="font-semibold tabular-nums text-slate-900">{projects.length}</span> sites registered
              </>
            )}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr className="whitespace-nowrap">
                <th scope="col" className="px-5 py-3 font-medium">Site</th>
                <th scope="col" className="px-5 py-3 font-medium">Location</th>
                <th scope="col" className="px-5 py-3 font-medium">Civil status</th>
                <th scope="col" className="px-5 py-3 font-medium">Structural status</th>
                <th scope="col" className="px-5 py-3 font-medium">Date added</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {[36, 48, 24, 24, 24, 16].map((w, j) => (
                      <td key={j} className="px-5 py-4">
                        <span className="inline-block h-4 animate-pulse rounded bg-slate-200" style={{ width: `${w * 4}px` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Inbox size={28} className="mx-auto text-slate-300" aria-hidden />
                    <p className="mt-3 text-sm font-medium text-slate-700">{q ? "No sites match your search" : "No sites yet"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {q ? "Try a different site name or location." : "Add your first site to start tracking progress."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((site) => (
                  <tr key={site.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="min-w-[160px] px-5 py-4 align-top font-medium text-slate-900">{site.siteName}</td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex min-w-[200px] items-start gap-1.5 text-slate-600 sm:max-w-xs">
                        <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
                        <span className="leading-snug">
                          {site.location} <span className="text-slate-400">({site.state})</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">{getStatusBadge(site.civilStatus)}</td>
                    <td className="px-5 py-4 align-top">{getStatusBadge(site.structuralStatus)}</td>
                    <td className="whitespace-nowrap px-5 py-4 align-top text-slate-600">
                      <div className="flex items-center gap-1.5 tabular-nums">
                        <Calendar size={14} className="text-slate-400" aria-hidden />
                        {new Date(site.createdAt).toLocaleDateString("en-GB")}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right align-top">
                      <button
                        onClick={() => handleViewDetails(site)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                      >
                        <Eye size={15} aria-hidden /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL 1: ADD SITE ================= */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-site-title"
        >
          <div className="my-8 w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 id="add-site-title" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <Building size={18} className="text-slate-500" aria-hidden /> Add new site
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">Enter the project and location details.</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Project ID</label>
                  <div className="relative">
                    <Hash size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
                    <input
                      type="text"
                      required
                      placeholder="e.g. NTPL-001"
                      className={`${inputClass} pl-9`}
                      value={formData.projectId}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Site name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Solar Array"
                    className={inputClass}
                    value={formData.siteName}
                    onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Village / location</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Phase 3 Road"
                  className={inputClass}
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Taluka</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mulshi"
                    className={inputClass}
                    value={formData.taluka}
                    onChange={(e) => setFormData({ ...formData, taluka: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>District</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pune"
                    className={inputClass}
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                >
                  Save site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: VIEW DETAILS ================= */}
      {viewSite && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="site-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div className="min-w-0">
                <h2 id="site-title" className="truncate text-xl font-semibold tracking-tight text-slate-900">
                  {viewSite.siteName}
                </h2>
                <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-500">
                  <MapPin size={15} className="mt-0.5 shrink-0" aria-hidden /> {viewSite.location}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Civil</span>
                  {getStatusBadge(viewSite.civilStatus)}
                  <span className="ml-2">Structure</span>
                  {getStatusBadge(viewSite.structuralStatus)}
                </div>
              </div>
              <button
                onClick={() => setViewSite(null)}
                aria-label="Close details"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-8 overflow-y-auto bg-slate-50 p-6">
              {imagesLoading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16">
                  <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" />
                  <p className="text-sm text-slate-500">Loading photos and documents…</p>
                </div>
              ) : (
                <>
                  <MediaSection
                    title="Civil works progress photos"
                    icon={HardHat}
                    iconClass="text-blue-600"
                    images={civilSiteImages}
                    emptyText="No civil progress photos uploaded yet."
                    alt="Civil progress"
                  />
                  <MediaSection
                    title="Civil documentation"
                    icon={FileText}
                    iconClass="text-blue-600"
                    images={civilDocsImages}
                    emptyText="No civil documents uploaded yet."
                    alt="Civil document"
                    docsLabel="Civil docs"
                  />
                  <MediaSection
                    title="Structural and solar installation photos"
                    icon={Wrench}
                    iconClass="text-violet-600"
                    images={structuralSiteImages}
                    emptyText="No structural progress photos uploaded yet."
                    alt="Structural progress"
                  />
                  <MediaSection
                    title="Structural documentation"
                    icon={FileText}
                    iconClass="text-violet-600"
                    images={structuralDocsImages}
                    emptyText="No structural documents uploaded yet."
                    alt="Structural document"
                    docsLabel="Struct docs"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= FULLSCREEN IMAGE LIGHTBOX ================= */}
      {viewFullscreenImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setViewFullscreenImage(null)}
        >
          <button
            onClick={() => setViewFullscreenImage(null)}
            aria-label="Close preview"
            className="absolute right-5 top-5 z-[101] rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20"
          >
            <X size={22} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewFullscreenImage}
            alt="Fullscreen view"
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
