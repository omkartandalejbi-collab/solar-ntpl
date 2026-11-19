"use client";

import { useEffect, useState, useRef } from "react";
import { Wrench, MapPin, CheckCircle2, Clock, AlertCircle, X, Calendar, Image as ImageIcon, Plus, Loader2, ArrowRight, Sun, Lock, Eye, FileText } from "lucide-react";

// ==========================================
// INTERFACES
// ==========================================
interface ProjectSite {
  id: string;
  siteName: string;
  location: string;
  state: string;
  civilStatus: string;
  structuralStatus: string; // PENDING, MATERIAL_ARRIVED, FRAME_FITTED, PANELS_MOUNTED
  createdAt: string;
}

interface SiteImage {
  id: string;
  url: string;
  phase: string;
  createdAt: string;
  uploadedBy?: string;
}

export default function StructuresPage() {
  const [projects, setProjects] = useState<ProjectSite[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal & Tab State
  const [selectedSite, setSelectedSite] = useState<ProjectSite | null>(null);
  const [activePhase, setActivePhase] = useState("PHASE 1");
  const [uploading, setUploading] = useState(false);
  const [galleryImages, setGalleryImages] = useState<SiteImage[]>([]);

  // Lightbox State for viewing large images
  const [viewImage, setViewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // FETCH DATA
  // ==========================================
  useEffect(() => {
    fetchStructuralProjects();
  }, []);

  const fetchStructuralProjects = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/projects");
      if (response.ok) {
        const data: ProjectSite[] = await response.json();
        const readyForStructure = data.filter(site => site.civilStatus === "COMPLETED");
        setProjects(readyForStructure);
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
    
    // Auto-select correct tab based on current status
    if (site.structuralStatus === "PENDING") setActivePhase("PHASE 1");
    else if (site.structuralStatus === "MATERIAL_ARRIVED") setActivePhase("PHASE 2");
    else setActivePhase("PHASE 3");

    fetchSiteImages(site.id); 
  };

  // ==========================================
  // 📸 IMAGE UPLOAD LOGIC
  // ==========================================
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, phase: string) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedSite) return;

    const currentPhaseImages = galleryImages.filter(img => img.phase === `STRUCT_${phase}`);
    if (currentPhaseImages.length >= 4) {
      alert("Maximum 4 images allowed per phase!");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("siteImage", files[0]);
    formData.append("projectId", selectedSite.id);
    formData.append("phase", `STRUCT_${phase}`); 

    try {
      const response = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include", 
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

  // ==========================================
  // 🚀 MOVE TO NEXT STAGE (SEQUENTIAL LOGIC)
  // ==========================================
  const handleMoveToNextStage = async () => {
    if (!selectedSite) return;

    let nextStatus = "MATERIAL_ARRIVED";
    if (selectedSite.structuralStatus === "MATERIAL_ARRIVED") nextStatus = "FRAME_FITTED";
    else if (selectedSite.structuralStatus === "FRAME_FITTED") nextStatus = "PANELS_MOUNTED";

    try {
      const response = await fetch(`http://localhost:5000/api/projects/${selectedSite.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structuralStatus: nextStatus }),
        credentials: "include", 
      });

      if (response.ok) {
        const updatedProject = await response.json();
        
        const updatedList = projects.map(p => p.id === selectedSite.id ? updatedProject : p);
        setProjects(updatedList);
        setSelectedSite(updatedProject);
        
        if (nextStatus === "MATERIAL_ARRIVED") setActivePhase("PHASE 2");
        else if (nextStatus === "FRAME_FITTED") setActivePhase("PHASE 3");
      }
    } catch (error) {
      console.error("Failed to update structural status:", error);
    }
  };

  // ==========================================
  // UI HELPERS
  // ==========================================
  const getStructuralStatusBadge = (status: string) => {
    switch (status) {
      case "PANELS_MOUNTED":
        return <span className="flex items-center gap-1.5 w-fit bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"><Sun size={14} /> PANELS MOUNTED</span>;
      case "FRAME_FITTED":
        return <span className="flex items-center gap-1.5 w-fit bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"><CheckCircle2 size={14} /> FRAME FITTED</span>;
      case "MATERIAL_ARRIVED":
        return <span className="flex items-center gap-1.5 w-fit bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"><Clock size={14} /> MATERIAL ARRIVED</span>;
      default:
        return <span className="flex items-center gap-1.5 w-fit bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"><AlertCircle size={14} /> PENDING</span>;
    }
  };

  const isUploadAllowed = (phase: string, status: string) => {
    if (phase === 'PHASE 1' && status !== 'PENDING') return false; 
    if (phase === 'PHASE 2' && (status === 'FRAME_FITTED' || status === 'PANELS_MOUNTED')) return false; 
    if (phase === 'PHASE 3' && status === 'PANELS_MOUNTED') return false; 
    return true; 
  };

  const activePhaseImages = galleryImages.filter((img) => img.phase === `STRUCT_${activePhase}`);

  // 🚀 Logic to check if at least ONE photo is uploaded for the REQUIRED current phase
  let currentRequiredPhase = "PHASE 1";
  if (selectedSite?.structuralStatus === "MATERIAL_ARRIVED") currentRequiredPhase = "PHASE 2";
  else if (selectedSite?.structuralStatus === "FRAME_FITTED") currentRequiredPhase = "PHASE 3";
  
  const hasRequiredPhotos = galleryImages.some(img => img.phase === `STRUCT_${currentRequiredPhase}`);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="text-purple-600" size={28} /> Structural & Solar Works
          </h1>
          <p className="text-slate-500 text-sm mt-1">Sites available here have completed civil works and are ready for panel installation.</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 px-4 py-2 rounded-lg text-purple-800 text-sm font-semibold flex items-center gap-2">
          Ready Sites: <span className="bg-[#0f172a] text-white px-2 py-0.5 rounded-md">{projects.length}</span>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Site Name</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Location / State</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Structural Status</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Added On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Loading structures...</td></tr>
              ) : projects.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">No sites are ready for structural work yet. Complete civil works first.</td></tr>
              ) : (
                projects.map((site) => (
                  <tr 
                    key={site.id} 
                    onClick={() => handleRowClick(site)}
                    className="hover:bg-purple-50 transition-colors cursor-pointer group"
                  >
                    <td className="p-4 font-semibold text-slate-900 text-sm group-hover:text-purple-700">{site.siteName}</td>
                    <td className="p-4"><div className="flex items-center gap-1.5 text-sm text-slate-600"><MapPin size={14} className="text-slate-400" />{site.location}</div></td>
                    <td className="p-4">{getStructuralStatusBadge(site.structuralStatus)}</td>
                    <td className="p-4 text-sm text-slate-500">{new Date(site.createdAt).toLocaleDateString('en-GB')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================== */}
      {/* POPUP MODAL (Strict Sequence & Max Limits) */}
      {/* ========================================== */}
      {selectedSite && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 sm:p-8 pb-4 shrink-0 relative bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                {getStructuralStatusBadge(selectedSite.structuralStatus)}
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] tracking-tight pr-12">
                {selectedSite.siteName.replace(/\[.*?\]\s*/, '')}
              </h2>
              <button onClick={() => setSelectedSite(null)} className="absolute top-8 right-8 p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto p-6 sm:p-8 flex-1">
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
                
                {/* Left: Overview */}
                <div className="w-full lg:w-1/3 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Site Overview</h3>
                  
                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl flex items-start gap-4">
                    <div className="bg-emerald-100 p-2.5 rounded-lg text-emerald-600 shrink-0"><CheckCircle2 size={20} /></div>
                    <div>
                      <p className="text-xs text-emerald-600 font-bold mb-0.5">Civil Cleared</p>
                      <p className="text-sm font-bold text-slate-900 leading-snug">Ready for Installation</p>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-start gap-4">
                    <div className="bg-blue-100 p-2.5 rounded-lg text-blue-600 shrink-0"><MapPin size={20} /></div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-0.5">Location</p>
                      <p className="text-sm font-bold text-slate-900 leading-snug">{selectedSite.location}</p>
                    </div>
                  </div>
                </div>

                {/* Right: Media Gallery & Strict Sequence Workflow */}
                <div className="w-full lg:w-2/3 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-12 pt-6 lg:pt-0 flex flex-col justify-between">
                  
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <ImageIcon size={16} /> Installation Gallery
                    </h3>

                    {/* Phase Locking Tabs */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {['PHASE 1', 'PHASE 2', 'PHASE 3', 'PHASE 4'].map((phase) => {
                        let isLocked = false;
                        let tabLabel = "";
                        
                        if (phase === 'PHASE 1') {
                          tabLabel = 'MATERIAL';
                        } else if (phase === 'PHASE 2') {
                          tabLabel = 'FRAME WORK';
                          isLocked = selectedSite.structuralStatus === 'PENDING';
                        } else if (phase === 'PHASE 3') {
                          tabLabel = 'SOLAR PANELS';
                          isLocked = selectedSite.structuralStatus === 'PENDING' || selectedSite.structuralStatus === 'MATERIAL_ARRIVED';
                        } else if (phase === 'PHASE 4') {
                          tabLabel = 'DOCUMENTATION';
                          isLocked = false; 
                        }
                        
                        return (
                          <button 
                            key={phase}
                            disabled={isLocked}
                            onClick={() => setActivePhase(phase)}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border-2 ${
                              activePhase === phase 
                                ? 'bg-white border-[#0f172a] text-[#0f172a] shadow-sm' 
                                : isLocked 
                                ? 'bg-slate-50 border-slate-100 text-slate-400 opacity-60 cursor-not-allowed'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {isLocked && <Lock size={12} />}
                            {tabLabel}
                          </button>
                        );
                      })}
                    </div>

                    {/* GALLERY GRID */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      
                      {/* Upload Box */}
                      {activePhaseImages.length < 4 && isUploadAllowed(activePhase, selectedSite.structuralStatus) && (
                        <div className="relative border-2 border-dashed border-purple-300 bg-purple-50 hover:bg-purple-100 transition-colors rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer min-h-[140px] group">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => handleImageUpload(e, activePhase)}
                            disabled={uploading}
                            ref={fileInputRef}
                          />
                          {uploading ? (
                            <div className="flex flex-col items-center">
                              <Loader2 size={24} className="mb-2 animate-spin text-purple-600" />
                              <span className="text-xs font-semibold text-purple-600">Uploading...</span>
                            </div>
                          ) : (
                            <>
                              <Plus className="text-purple-600 mb-2 group-hover:scale-110 transition-transform" size={28} />
                              <p className="text-xs font-bold text-purple-700">Upload Photo</p>
                              <p className="text-[10px] text-purple-500 mt-1 uppercase">
                                ({activePhase === 'PHASE 1' ? 'Material' : activePhase === 'PHASE 2' ? 'Frames' : activePhase === 'PHASE 3' ? 'Panels' : 'Docs'})
                              </p>
                            </>
                          )}
                        </div>
                      )}

                      {/* Image Cards */}
                      {activePhaseImages.map((img) => (
                        <div key={img.id} className="relative group border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 flex flex-col min-h-[140px]">
                          <div className="flex-1 relative cursor-pointer" onClick={() => setViewImage(img.url)}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.url} alt="Progress" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition-colors flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 bg-white p-2.5 rounded-full text-slate-800 shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                                <Eye size={18} />
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-2.5 bg-white border-t border-slate-100 flex items-start justify-between">
                            <div>
                               <p className="text-[10px] font-extrabold text-purple-600 uppercase">By: {img.uploadedBy || "Admin"}</p>
                               <p className="text-[9px] font-medium text-slate-500 mt-0.5">
                                 {new Date(img.createdAt).toLocaleDateString('en-GB')} • {new Date(img.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                               </p>
                            </div>
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center mb-8">
                      <p className="text-xs font-medium text-slate-500">
                        <strong className="text-slate-800">{activePhaseImages.length}</strong> / 4 photos uploaded
                      </p>
                    </div>

                  </div>

                  {/* 🚀 ACTION BAR: MOVE TO NEXT STAGE */}
                  <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Current Progress</p>
                      {getStructuralStatusBadge(selectedSite.structuralStatus)}
                    </div>

                    {activePhase === "PHASE 4" ? (
                      <div className="text-sm font-bold text-purple-600 bg-purple-50 px-5 py-2.5 rounded-lg border border-purple-100 flex items-center gap-2">
                        <FileText size={18} /> Documentation Optional
                      </div>
                    ) : selectedSite.structuralStatus !== "PANELS_MOUNTED" ? (
                      <div className="flex flex-col items-end">
                        {/* 🚀 Button disables if required photo is not uploaded */}
                        <button 
                          onClick={handleMoveToNextStage}
                          disabled={!hasRequiredPhotos}
                          className={`w-full sm:w-auto px-6 py-3 rounded-lg text-xs font-bold flex justify-center items-center gap-2 shadow transition-colors ${
                            hasRequiredPhotos 
                              ? "bg-[#0f172a] hover:bg-slate-800 text-white" 
                              : "bg-slate-300 text-slate-500 cursor-not-allowed"
                          }`}
                        >
                          {selectedSite.structuralStatus === "PENDING" ? "Material Arrived (Move to Frames)" : 
                           selectedSite.structuralStatus === "MATERIAL_ARRIVED" ? "Frames Fitted (Move to Panels)" :
                           "Complete Solar Panels"} 
                          <ArrowRight size={16} />
                        </button>
                        
                        {/* 🚀 Warning Message */}
                        {!hasRequiredPhotos && (
                          <p className="text-[10px] text-rose-500 font-bold mt-2 tracking-wide">
                            * Please upload at least 1 photo to proceed
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-emerald-600 bg-emerald-50 px-5 py-2.5 rounded-lg border border-emerald-100 flex items-center gap-2">
                        <Sun size={18} /> Solar Plant Successfully Mounted
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🚀 FULLSCREEN IMAGE LIGHTBOX */}
      {/* ========================================== */}
      {viewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 p-4 sm:p-8 backdrop-blur-sm animate-in fade-in duration-200">
          <button 
            onClick={() => setViewImage(null)} 
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-[101]"
          >
            <X size={24} />
          </button>
          
          <div className="relative w-full h-full flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={viewImage} 
              alt="Fullscreen View" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
            />
          </div>
        </div>
      )}

    </div>
  );
}