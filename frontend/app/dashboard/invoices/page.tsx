"use client";

import { useEffect, useState } from "react";
import { FileText, Plus, Printer, X, CheckCircle2, Clock } from "lucide-react";

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
  createdAt: string;
  milestones: PaymentMilestone[];
}

interface InvoiceItem {
  description: string;
  qty: number;
  rate: number;
}

export default function InvoicesPage() {
  const [projects, setProjects] = useState<ProjectSite[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal & Custom Invoice Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("INV-2026-001");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);

  // Dynamic Invoice Items (For Custom Invoice)
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "Solar PV Modules & Inverters (50 kW)", qty: 1, rate: 1800000 },
    { description: "Civil Structure & Mounting Hardware", qty: 1, rate: 400000 },
    { description: "Installation & Commissioning Charges", qty: 1, rate: 300000 },
  ]);

  // Preview State (When user clicks View/Download Invoice)
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);

  useEffect(() => {
    fetchProjectsWithPaidMilestones();
  }, []);

  const fetchProjectsWithPaidMilestones = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/billing", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();


        const projectsWithPayments = data.filter((site: ProjectSite) => {
          if (!site.milestones || site.milestones.length === 0) return false;
          return site.milestones.some((m) => m.status === "PAID");
        });

        setProjects(projectsWithPayments);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  // Strict Sequence Mapping: 1. 70%, 2. GST, 3. 30%
  const sequenceMap: Record<string, number> = {
    "70% Payment (Advance & Material)": 1,
    "30% Payment (Installation & Commissioning)": 2,
    "GST Component (18%)": 3,
  };

  const getSortedMilestones = (milestones: PaymentMilestone[]) => {
    return [...milestones].sort((a, b) => (sequenceMap[a.name] || 99) - (sequenceMap[b.name] || 99));
  };

  // Helper to get short tag & invoice suffix for each milestone
  const getMilestoneTag = (name: string) => {
    if (name.includes("70%")) return { label: "70% Advance", suffix: "70P" };
    if (name.includes("30%")) return { label: "30% Final", suffix: "30P" };
    if (name.includes("GST")) return { label: "18% GST", suffix: "GST" };
    return { label: name, suffix: "INV" };
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.qty * item.rate, 0);
  };

  const handleAddItem = () => {
    setItems([...items, { description: "", qty: 1, rate: 0 }]);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const proj = projects.find((p) => p.id === selectedProject);

    const newInv = {
      invoiceNo,
      invoiceTitle: "CUSTOM TAX INVOICE",
      date: invoiceDate,
      siteName: proj ? proj.siteName : "General Client",
      location: proj ? proj.location : "Pune, Maharashtra",
      items,
      total: calculateTotal(),
    };

    setActiveInvoice(newInv);
    setIsModalOpen(false);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="text-blue-600" size={28} /> Phase-wise Tax Invoices
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Generate separate invoices for 70% Advance, 18% GST, and 30% Final payments per project.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0f172a] hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow"
        >
          <Plus size={18} /> Create Custom Invoice
        </button>
      </div>

      {/* Invoice List Grid */}
      <div className="print:hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-bold">Loading invoices...</div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 mt-6">
            <CheckCircle2 size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold">No paid milestones found yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              As soon as a 70%, GST, or 30% payment is collected in Billing, its separate invoice will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {projects.map((site, index) => {
              const sortedMilestones = getSortedMilestones(site.milestones);
              const paidCount = sortedMilestones.filter((m) => m.status === "PAID").length;
              const isAllPaid = paidCount === sortedMilestones.length;

              return (
                <div
                  key={site.id}
                  className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      {isAllPaid ? (
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 size={12} /> ALL PAID ({paidCount}/{sortedMilestones.length})
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                          <Clock size={12} /> PARTIAL ({paidCount}/{sortedMilestones.length} PAID)
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-400">PRJ-00{index + 1}</span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base mb-1">{site.siteName}</h3>
                    <p className="text-xs text-slate-500 mb-4">{site.location}</p>
                  </div>

                  {/* 🚀 SEPARATE INVOICE ROWS FOR 70%, GST, AND 30% */}
                  <div className="pt-3 border-t border-slate-100 space-y-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Separate Phase Invoices
                    </p>

                    {sortedMilestones.map((m) => {
                      const { label, suffix } = getMilestoneTag(m.name);
                      const isPaid = m.status === "PAID";
                      const phaseInvoiceNo = `INV-2026-00${index + 1}-${suffix}`;

                      return (
                        <div
                          key={m.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border ${
                            isPaid
                              ? "bg-slate-50 border-slate-200"
                              : "bg-slate-50/40 border-dashed border-slate-200 opacity-60"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-800">{label}</p>
                            <p className="text-[11px] font-semibold text-slate-500">
                              ₹ {m.amount.toLocaleString("en-IN")}
                            </p>
                          </div>

                          {isPaid ? (
                            <button
                              onClick={() =>
                                setActiveInvoice({
                                  invoiceNo: phaseInvoiceNo,
                                  invoiceTitle: `${label.toUpperCase()} INVOICE`,
                                  date: m.paidAt
                                    ? new Date(m.paidAt).toLocaleDateString("en-GB")
                                    : new Date().toLocaleDateString("en-GB"),
                                  siteName: site.siteName,
                                  location: site.location,
                                  items: [
                                    {
                                      description: m.name,
                                      qty: 1,
                                      rate: m.amount,
                                    },
                                  ],
                                  total: m.amount,
                                })
                              }
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <FileText size={12} /> Invoice
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">
                              Pending
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================================================= */}
      {/* 1. CREATE CUSTOM INVOICE MODAL                    */}
      {/* ================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 my-8">
            <div className="flex justify-between items-center bg-[#0f172a] text-white px-6 py-4">
              <h3 className="font-bold text-lg">Create Custom Invoice</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Select Project</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  required
                >
                  <option value="">-- Choose Site --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.siteName} ({p.location})
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase text-slate-600">Line Items / Description</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.qty}
                        onChange={(e) => handleItemChange(idx, "qty", Number(e.target.value))}
                        className="w-20 px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Rate (₹)"
                        value={item.rate}
                        onChange={(e) => handleItemChange(idx, "rate", Number(e.target.value))}
                        className="w-32 px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 font-medium"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-sm font-bold bg-[#0f172a] text-white rounded-md">
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* 2. INVOICE PREVIEW & PDF PRINT MODAL              */}
      {/* ================================================= */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto print:static print:bg-white print:p-0">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 my-8 flex flex-col max-h-[90vh] print:shadow-none print:border-none print:max-h-none print:my-0">
            {/* Modal Top Actions (Hidden when printing) */}
            <div className="p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center shrink-0 print:hidden">
              <span className="text-xs font-bold text-slate-600 uppercase">
                {activeInvoice.invoiceTitle || "Tax Invoice Preview"}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrintPDF}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow"
                >
                  <Printer size={16} /> Download PDF / Print
                </button>
                <button
                  onClick={() => setActiveInvoice(null)}
                  className="p-1.5 bg-white border rounded-full text-slate-500 hover:text-slate-800"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* PRINTABLE INVOICE TEMPLATE */}
            <div className="p-8 sm:p-12 overflow-y-auto bg-white flex-1 text-slate-800" id="printable-invoice">
              {/* Company Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-8 mb-8">
                <div>
                  <h2 className="text-2xl font-extrabold text-[#0f172a]">SUNRAYS INDIA</h2>
                  <p className="text-xs text-slate-500 mt-1">Solar Energy Solutions & PM Suryaghar Yojana</p>
                  <p className="text-xs text-slate-500">Vadgaon Budruk, Pune, Maharashtra</p>
                </div>
                <div className="text-right">
                  <h3 className="text-xl font-bold text-blue-600">
                    {activeInvoice.invoiceTitle || "TAX INVOICE"}
                  </h3>
                  <p className="text-xs font-bold text-slate-700 mt-1">{activeInvoice.invoiceNo}</p>
                  <p className="text-xs text-slate-500">Date: {activeInvoice.date}</p>
                </div>
              </div>

              {/* Bill To */}
              <div className="mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-bold uppercase text-slate-400 mb-1">Billed To:</p>
                <h4 className="font-bold text-slate-900">{activeInvoice.siteName}</h4>
                <p className="text-xs text-slate-600">{activeInvoice.location}</p>
              </div>

              {/* Items Table */}
              <table className="w-full text-left border-collapse mb-8">
                <thead>
                  <tr className="border-b-2 border-slate-200 text-xs font-bold text-slate-500 uppercase">
                    <th className="py-3">Description</th>
                    <th className="py-3 text-center">Qty</th>
                    <th className="py-3 text-right">Rate (₹)</th>
                    <th className="py-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {activeInvoice.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-3 font-medium text-slate-900">{item.description}</td>
                      <td className="py-3 text-center text-slate-600">{item.qty}</td>
                      <td className="py-3 text-right text-slate-600">₹ {item.rate.toLocaleString("en-IN")}</td>
                      <td className="py-3 text-right font-bold text-slate-900">
                        ₹ {(item.qty * item.rate).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total Calculation */}
              <div className="flex justify-end border-t border-slate-200 pt-4 mb-12">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-base font-extrabold text-[#0f172a]">
                    <span>Total Amount Paid:</span>
                    <span>₹ {activeInvoice.total.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Footer / Signature */}
              <div className="flex justify-between items-end pt-12 border-t border-slate-200 text-xs text-slate-500">
                <div>
                  <p className="font-bold text-slate-700">Bank Details:</p>
                  <p>A/C Name: Sunrays India</p>
                  <p>A/C No: 12345678905 | IFSC: SBIN0001234</p>
                </div>
                <div className="text-right">
                  <div className="h-12"></div>
                  <p className="font-bold text-slate-700 border-t border-slate-300 pt-1">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}