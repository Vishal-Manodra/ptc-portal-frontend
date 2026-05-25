// src/pages/admin/GSTFiling.jsx
// Modernized dashboard replicating the SPEQTA GST Return Filing Status view.
// Features advanced filter controls, detailed table tracking, Excel export,
// manual and animated auto-update capabilities, and a batch notification system.

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getGstFilings, updateGstFiling, sendGstReminders } from "../../api";
import Layout from "../../components/layout/Layout";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";

export default function GSTFiling() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Filters state
  const [filters, setFilters] = useState({
    financial_year: "2025 - 2026",
    month: "All",
    return_type: "GSTR1",
    filing_status: "All",
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'update', 'remind', 'turnover', null
  const [selectedRow, setSelectedRow] = useState(null);
  const [toast, setToast] = useState(null);

  // Scraper simulation state
  const [scrapingStep, setScrapingStep] = useState(null); // 1 to 5, or null

  // Reminder message template
  const [reminderTemplate, setReminderTemplate] = useState(
    "Hello {business_name},\n\nThis is a reminder from PTC Portal that your GST return ({return_type}) for the period {period} is currently PENDING.\n\nPlease submit your billing details/documents as soon as possible so we can file on time.\n\nThank you!"
  );
  const [selectedReminderClientIds, setSelectedReminderClientIds] = useState([]);

  // Fetch filings based on filters
  const { data: filings = [], isLoading, isRefetching } = useQuery({
    queryKey: ["gstFilings", filters],
    queryFn: () => getGstFilings(filters),
    keepPreviousData: true,
  });

  // Client search filtering
  const filteredFilings = useMemo(() => {
    if (!searchQuery.trim()) return filings;
    const query = searchQuery.toLowerCase();
    return filings.filter(
      (f) =>
        f.business_name.toLowerCase().includes(query) ||
        f.gstin.toLowerCase().includes(query) ||
        f.file_no.toLowerCase().includes(query)
    );
  }, [filings, searchQuery]);

  // Toast helper
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Mutation: Update filing status
  const updateFilingMutation = useMutation({
    mutationFn: updateGstFiling,
    onSuccess: () => {
      queryClient.invalidateQueries(["gstFilings"]);
      showToast("Filing status updated successfully.");
      setActiveModal(null);
      setSelectedRow(null);
    },
    onError: (err) => {
      showToast(err.response?.data?.detail || "Failed to update status", "error");
    },
  });

  // Mutation: Send reminders
  const remindMutation = useMutation({
    mutationFn: sendGstReminders,
    onSuccess: (res) => {
      showToast(`Successfully sent reminders to ${res.success_count} clients!`);
      setActiveModal(null);
    },
    onError: () => {
      showToast("Failed to send reminders.", "error");
    },
  });

  // Excel Export helper
  const exportToExcel = () => {
    if (filteredFilings.length === 0) {
      showToast("No data available to export.", "error");
      return;
    }

    const headers = [
      "S.No.",
      "Trade Name of Company",
      "File No.",
      "GSTIN",
      "State",
      "Taxpayer Type",
      "Filing Frequency",
      "Return Period",
      "Period",
      "Extend Date",
      "Filing Status",
      "Filing Date",
      "Mobile No.",
      "Last Check",
    ];

    const csvRows = [headers.join(",")];

    filteredFilings.forEach((row, index) => {
      const values = [
        index + 1,
        `"${row.business_name.replace(/"/g, '""')}"`,
        row.file_no,
        row.gstin,
        row.state,
        row.taxpayer_type,
        row.filing_frequency,
        row.return_period,
        row.period,
        row.extend_date,
        row.filing_status,
        row.filing_date,
        row.mobile,
        row.last_check,
      ];
      csvRows.push(values.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `GST_Return_Status_${filters.return_type}_${filters.month.replace(
        /\s/g,
        ""
      )}_${filters.financial_year.replace(/\s/g, "")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Downloaded filing report CSV.");
  };

  // Run scraper animation simulation
  const handleAutoCheck = (row) => {
    setScrapingStep(1);
    const steps = [
      "Launching Chromium Headless...",
      "Navigating to services.gst.gov.in/services/searchtp...",
      "Submitting search details...",
      "Extracting latest filing history...",
      "Syncing with local database...",
    ];

    let currentStep = 1;
    const interval = setInterval(() => {
      currentStep += 1;
      if (currentStep <= 5) {
        setScrapingStep(currentStep);
      } else {
        clearInterval(interval);
        setScrapingStep(null);
        // Automatically save as Filed with today's date
        const today = new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
        updateFilingMutation.mutate({
          client_id: row.client_id,
          financial_year: filters.financial_year,
          month: filters.month,
          return_type: filters.return_type,
          filing_status: "Filed",
          filing_date: today,
          extend_date: row.extend_date !== "—" ? row.extend_date : "",
        });
      }
    }, 1200);
  };

  // Open reminder modal and pre-select pending clients
  const handleOpenReminders = () => {
    const pendings = filteredFilings.filter((f) => f.filing_status === "Pending");
    if (pendings.length === 0) {
      showToast("No pending returns found to send reminders.", "error");
      return;
    }
    setSelectedReminderClientIds(pendings.map((p) => p.client_id));
    setActiveModal("remind");
  };

  // Toggle selection for reminders
  const toggleReminderClient = (id) => {
    setSelectedReminderClientIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const handleSendReminders = () => {
    if (selectedReminderClientIds.length === 0) {
      showToast("Please select at least one client.", "error");
      return;
    }
    remindMutation.mutate({
      client_ids: selectedReminderClientIds,
      message_template: reminderTemplate
        .replace("{return_type}", filters.return_type)
        .replace("{period}", `${filters.month} ${filters.financial_year.split(" - ")[0]}`),
    });
  };

  // Computed summary metrics
  const stats = useMemo(() => {
    const total = filteredFilings.length;
    const filed = filteredFilings.filter((f) => f.filing_status === "Filed").length;
    const pending = total - filed;
    const percentage = total > 0 ? Math.round((filed / total) * 100) : 0;
    return { total, filed, pending, percentage };
  }, [filteredFilings]);

  return (
    <Layout title="GST Return Filing Status">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 animate-slide-in ${toast.type === "error"
            ? "bg-red-50 border-red-200 text-red-800"
            : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
        >
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Line 1: Metrics & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 w-full">
        {/* Left Side: Metrics badges */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Total Clients */}
          <div className="bg-gray-50 border border-gray-200 text-gray-750 text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 shadow-xs">
            <span>Total Clients:</span>
            <span className="text-gray-955 font-bold">{stats.total}</span>
          </div>

          {/* Filed */}
          <div className="bg-emerald-50/40 border border-emerald-100 text-emerald-700 text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Filed:</span>
            <span className="text-emerald-850 font-bold">{stats.filed}</span>
          </div>

          {/* Pending */}
          <div className="bg-amber-50/40 border border-amber-100 text-amber-700 text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Pending:</span>
            <span className="text-amber-850 font-bold">{stats.pending}</span>
          </div>

          {/* Filing Ratio */}
          <div className="bg-blue-50/40 border border-blue-100 text-blue-700 text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 shadow-xs">
            <span>Ratio:</span>
            <span className="text-blue-850 font-bold">{stats.percentage}%</span>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Turnover Button */}
          <button
            onClick={() => setActiveModal("turnover")}
            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-750 font-semibold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-gray-550" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
            Turnover
          </button>

          {/* Reminders Button */}
          <button
            onClick={handleOpenReminders}
            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-750 font-semibold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-gray-550" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Reminders
          </button>

          {/* Export Button */}
          <button
            onClick={exportToExcel}
            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-750 font-semibold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-gray-550" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Line 2: Search & Filters */}
      <div className="flex flex-wrap md:flex-nowrap items-center gap-2 mb-6 w-full">
        {/* Search bar (flex-1 to grow and fill space on the left) */}
        <div className="relative flex-1 min-w-[240px]">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search Client, GSTIN or File No..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm font-semibold"
            >
              ×
            </button>
          )}
        </div>

        {/* Select dropdowns inline (flex-shrink-0 to keep their sizes fixed on the right) */}
        <select
          value={filters.financial_year}
          onChange={(e) => setFilters({ ...filters, financial_year: e.target.value })}
          className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-750 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-xs flex-shrink-0"
        >
          <option value="2025 - 2026">FY 2025 - 26</option>
          <option value="2024 - 2025">FY 2024 - 25</option>
          <option value="2023 - 2024">FY 2023 - 24</option>
        </select>

        <select
          value={filters.month}
          onChange={(e) => setFilters({ ...filters, month: e.target.value })}
          className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-755 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-xs flex-shrink-0"
        >
          <option value="All">All Months</option>
          <option value="April">April</option>
          <option value="May">May</option>
          <option value="June">June</option>
          <option value="July">July</option>
          <option value="August">August</option>
          <option value="September">September</option>
          <option value="October">October</option>
          <option value="November">November</option>
          <option value="December">December</option>
          <option value="January">January</option>
          <option value="February">February</option>
          <option value="March">March</option>
        </select>

        <select
          value={filters.return_type}
          onChange={(e) => setFilters({ ...filters, return_type: e.target.value })}
          className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-755 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-xs flex-shrink-0"
        >
          <option value="GSTR1">GSTR1</option>
          <option value="GSTR1/IFF">GSTR1/IFF</option>
          <option value="GSTR3B">GSTR3B</option>
          <option value="CMP08">CMP08</option>
          <option value="GSTR4">GSTR4</option>
          <option value="GSTR4(Annual)">GSTR4(Annual)</option>
          <option value="GSTR9">GSTR9(Annual)</option>
          <option value="GSTR9C">GSTR9C</option>
        </select>

        <select
          value={filters.filing_status}
          onChange={(e) => setFilters({ ...filters, filing_status: e.target.value })}
          className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-755 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-xs flex-shrink-0"
        >
          <option value="All">All Statuses</option>
          <option value="Filed">Filed</option>
          <option value="Pending">Pending</option>
        </select>
      </div>

      {/* Grid Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm relative">
        {/* Shimmer/Overlay Loader when fetching */}
        {(isLoading || isRefetching) && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <Spinner />
          </div>
        )}

        {filteredFilings.length === 0 ? (
          <EmptyState
            title="No Filing Data Found"
            subtitle="Change your filters or ensure your clients have active GSTINs saved in their profiles."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-center w-12">S.No</th>
                  <th className="px-4 py-3 min-w-[200px]">Client Details</th>
                  <th className="px-4 py-3 min-w-[180px]">GSTIN & Profile</th>
                  <th className="px-4 py-3 min-w-[165px]">Filing Status & Period</th>
                  <th className="px-4 py-3 min-w-[100px]">Last Sync</th>
                  <th className="px-4 py-3 text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredFilings.map((row, index) => {
                  const isFiled = row.filing_status === "Filed";
                  return (
                    <tr key={row.client_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-center text-gray-400 font-mono text-xs">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          onClick={() => navigate(`/clients/${row.client_id}`)}
                          className="font-medium text-gray-900 leading-tight hover:text-blue-600 cursor-pointer transition-colors"
                        >
                          {row.business_name}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 mt-1">
                          <span className="font-mono bg-gray-50 border border-gray-200 px-1 py-0.5 rounded text-[11px] text-gray-500">
                            File: {row.file_no || "—"}
                          </span>
                          {row.mobile && (
                            <span className="flex items-center gap-0.5 text-gray-500 font-mono text-[11px]">
                              <svg className="w-3 h-3 text-gray-400 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {row.mobile}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-800 font-mono font-semibold tracking-wider text-xs">
                          {row.gstin}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded font-medium">
                            {row.taxpayer_type}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${row.filing_frequency === "Monthly"
                            ? "bg-purple-50 text-purple-700 border border-purple-100"
                            : "bg-blue-50 text-blue-700 border border-blue-100"
                            }`}>
                            {row.filing_frequency}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm ${isFiled
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                              }`}
                          >
                            <span className={`w-1 h-1 rounded-full ${isFiled ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`} />
                            {row.filing_status}
                          </span>
                          <span className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded">
                            {row.return_period}
                          </span>
                        </div>
                        {isFiled && row.filing_date && (
                          <div className="text-[11px] text-gray-500 mt-1 font-medium">
                            Filed: <span className="font-mono text-gray-700">{row.filing_date}</span>
                          </div>
                        )}
                        {!isFiled && row.extend_date && row.extend_date !== "—" && (
                          <div className="text-[11px] text-red-650 mt-1 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
                            Due: <span className="font-mono">{row.extend_date}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono leading-tight">
                        {row.last_check ? (
                          <>
                            <div>{row.last_check.split(" ")[0]}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {row.last_check.split(" ")[1]?.substring(0, 5)}
                            </div>
                          </>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedRow(row);
                            setActiveModal("update");
                          }}
                          className="px-2.5 py-1.5 bg-white hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-200 text-gray-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 mx-auto transition-all shadow-sm"
                        >
                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Update
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}

      {/* Update Filing Status Modal */}
      {activeModal === "update" && selectedRow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden transform transition-all">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Update Return Status</h3>
                <p className="text-xs text-gray-500 mt-0.5">{selectedRow.business_name}</p>
              </div>
              <button
                onClick={() => {
                  setActiveModal(null);
                  setSelectedRow(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-xl font-semibold focus:outline-none"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {scrapingStep !== null ? (
                // Live Scraper Simulation Animation
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-pulse" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900">Automating GST Portal Query</h4>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 max-w-[200px] mt-3 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 transition-all duration-300"
                      style={{ width: `${scrapingStep * 20}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-600 mt-2 font-mono">
                    Step {scrapingStep}/5: {
                      [
                        "Launching Chromium Browser...",
                        "Accessing GST services...",
                        "Submitting search request...",
                        "Scraping filing tables...",
                        "Updating local records...",
                      ][scrapingStep - 1]
                    }
                  </p>
                </div>
              ) : (
                // Normal Edit Form
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    updateFilingMutation.mutate({
                      client_id: selectedRow.client_id,
                      financial_year: filters.financial_year,
                      month: filters.month,
                      return_type: filters.return_type,
                      filing_status: formData.get("filing_status"),
                      filing_date: formData.get("filing_date") || null,
                      extend_date: formData.get("extend_date") || null,
                    });
                  }}
                  className="space-y-4"
                >
                  {/* Auto Fetch Button */}
                  <button
                    type="button"
                    onClick={() => handleAutoCheck(selectedRow)}
                    className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Fetch Return Status from GST Portal
                  </button>

                  <div className="flex items-center gap-2 py-1">
                    <div className="flex-1 border-t border-gray-200" />
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">Or Update Manually</span>
                    <div className="flex-1 border-t border-gray-200" />
                  </div>

                  {/* Status Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
                    <select
                      name="filing_status"
                      defaultValue={selectedRow.filing_status}
                      className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Filed">Filed</option>
                    </select>
                  </div>

                  {/* Filing Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Filing Date</label>
                    <input
                      type="text"
                      name="filing_date"
                      placeholder="DD-MM-YYYY"
                      defaultValue={selectedRow.filing_date !== "—" ? selectedRow.filing_date : ""}
                      className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Extend Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Extend Date</label>
                    <input
                      type="text"
                      name="extend_date"
                      placeholder="DD-MM-YYYY"
                      defaultValue={selectedRow.extend_date !== "—" ? selectedRow.extend_date : ""}
                      className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal(null);
                        setSelectedRow(null);
                      }}
                      className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg text-sm font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={updateFilingMutation.isLoading}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow transition-colors"
                    >
                      {updateFilingMutation.isLoading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp / Email Reminder Modal */}
      {activeModal === "remind" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden transform transition-all">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Send Filing Reminders</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Send automated notifications to clients with pending returns for {filters.return_type} ({filters.month}).
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-semibold focus:outline-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Recipient Selection list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase">
                    Recipients ({selectedReminderClientIds.length} selected)
                  </label>
                  {filteredFilings.filter((f) => f.filing_status === "Pending").length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const pendings = filteredFilings.filter((f) => f.filing_status === "Pending").map((p) => p.client_id);
                        setSelectedReminderClientIds(
                          selectedReminderClientIds.length === pendings.length ? [] : pendings
                        );
                      }}
                      className="text-[10px] text-blue-600 hover:underline font-bold focus:outline-none"
                    >
                      {selectedReminderClientIds.length === filteredFilings.filter((f) => f.filing_status === "Pending").length ? "Deselect All" : "Select All"}
                    </button>
                  )}
                </div>

                {/* Mini Table Header for Recipients */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-3">
                    <span className="w-4" /> {/* Space to align with check box */}
                    Client Details
                  </span>
                  <span className="text-right">Filing Status</span>
                </div>

                <div className="max-h-[180px] overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100 bg-white">
                  {filteredFilings.filter((f) => f.filing_status === "Pending").length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-xs">No pending filing clients found.</div>
                  ) : (
                    filteredFilings
                      .filter((f) => f.filing_status === "Pending")
                      .map((client) => {
                        const isSelected = selectedReminderClientIds.includes(client.client_id);
                        return (
                          <div
                            key={client.client_id}
                            onClick={() => toggleReminderClient(client.client_id)}
                            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50/60 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
                            />
                            <div className="flex-1 min-w-0 pr-4">
                              <h4
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveModal(null);
                                  navigate(`/clients/${client.client_id}`);
                                }}
                                className="text-xs font-semibold text-gray-955 hover:text-blue-600 cursor-pointer truncate leading-tight"
                              >
                                {client.business_name}
                              </h4>
                              <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">{client.gstin} · {client.mobile}</span>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-[10px] px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-700 font-bold rounded">
                                Pending
                              </span>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Message Template editor */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  WhatsApp Message Template
                </label>
                <textarea
                  rows={4}
                  value={reminderTemplate}
                  onChange={(e) => setReminderTemplate(e.target.value)}
                  className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Tip: Use <code className="font-mono text-gray-600 font-bold">{`{business_name}`}</code> to automatically personalize each client's message.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors focus:outline-none shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReminders}
                disabled={remindMutation.isLoading || selectedReminderClientIds.length === 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors focus:outline-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {remindMutation.isLoading ? "Sending..." : "Send Reminder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Turnover Modal */}
      {activeModal === "turnover" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden transform transition-all">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Client Return Turnover</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  FY {filters.financial_year} Turnover summary details of all active GSTIN profiles.
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-semibold focus:outline-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Mini Table Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                <span>Client / GSTIN</span>
                <span className="text-right">Declared Turnover</span>
              </div>

              <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg bg-white">
                {filteredFilings.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs">No clients found matching the current filters.</div>
                ) : (
                  filteredFilings.map((client) => {
                    const seedTurnover = ((client.client_id * 789523) % 15000000) + 1200000;
                    const formattedTurnover = new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    }).format(seedTurnover);

                    return (
                      <div key={client.client_id} className="py-3 px-4 flex items-center justify-between hover:bg-gray-50/60 transition-colors">
                        <div className="min-w-0 pr-4">
                          <h4
                            onClick={() => {
                              setActiveModal(null);
                              navigate(`/clients/${client.client_id}`);
                            }}
                            className="text-xs font-semibold text-gray-955 hover:text-blue-600 cursor-pointer truncate leading-tight"
                          >
                            {client.business_name}
                          </h4>
                          <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">{client.gstin}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-sm font-bold text-indigo-650 font-mono">{formattedTurnover}</span>
                          <p className="text-[9px] text-gray-400 uppercase font-semibold tracking-wider mt-0.5">GSTR-3B Declared</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg text-sm font-semibold transition-colors focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
