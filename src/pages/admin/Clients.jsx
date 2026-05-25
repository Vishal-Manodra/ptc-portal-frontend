// src/pages/admin/Clients.jsx
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getClients, createClient, toggleClientStatus, deleteClient } from "../../api";
import Layout from "../../components/layout/Layout";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import EmptyState from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";

export default function Clients() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: getClients,
  });

  const editingClient =
    clients?.find((c) => String(c.id) === String(editId)) || null;

  useEffect(() => {
    if (editingClient) {
      setShowModal(true);
    }
  }, [editingClient]);

  const toggleStatus = useMutation({
    mutationFn: (id) => toggleClientStatus(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteClient(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (err) => {
      alert(err.response?.data?.detail || "Failed to delete client");
    }
  });

  // Extract unique services and assigned employee names dynamically from client data
  const uniqueServices = Array.from(
    new Set(
      clients.flatMap((c) => c.services?.map((cs) => cs.service?.name).filter(Boolean) || [])
    )
  ).sort();

  const uniqueEmployees = Array.from(
    new Set(
      clients.map((c) => c.assigned_employee?.name).filter(Boolean)
    )
  ).sort();

  const filtered = clients.filter((c) => {
    const matchesSearch =
      c.business_name.toLowerCase().includes(search.toLowerCase()) ||
      c.pan?.toLowerCase().includes(search.toLowerCase()) ||
      c.gstin?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    
    const matchesService = serviceFilter === "all" || 
      c.services?.some((cs) => cs.service?.name === serviceFilter);
    
    const matchesAssigned = assignedFilter === "all" ||
      (assignedFilter === "unassigned" && !c.assigned_employee) ||
      c.assigned_employee?.name === assignedFilter;

    return matchesSearch && matchesStatus && matchesService && matchesAssigned;
  });

  return (
    <Layout title="Clients — Master List">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by name, PAN, GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-600"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="dormant">Dormant</option>
          </select>

          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-600"
          >
            <option value="all">All Services</option>
            {uniqueServices.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>

          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-600"
          >
            <option value="all">All Assigned To</option>
            <option value="unassigned">Unassigned</option>
            {uniqueEmployees.map((emp) => (
              <option key={emp} value={emp}>
                {emp}
              </option>
            ))}
          </select>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg
                       hover:bg-blue-700 transition-colors flex items-center gap-2 flex-shrink-0"
          >
            <span>+</span> Add Client
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No clients found"
            subtitle={
              search ? "Try a different search term" : "Add your first client"
            }
            action={
              isAdmin && !search ? (
                <button
                  onClick={() => setShowModal(true)}
                  className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add Client
                </button>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    "Client",
                    "GSTIN / PAN",
                    "Services",
                    "Progress",
                    "Assigned To",
                    "Status",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-medium text-gray-500 px-4 py-3"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {client.business_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {client.contact_person || client.contact_name || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-mono text-gray-700">
                        {client.gstin || "—"}
                      </p>
                      <p className="text-xs font-mono text-gray-400">
                        {client.pan || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {client.services.slice(0, 2).map((cs) => (
                          <span
                            key={cs.id}
                            className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full"
                          >
                            {cs.service.name.split(" ")[0]}
                          </span>
                        ))}
                        {client.services.length > 2 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                            +{client.services.length - 2}
                          </span>
                        )}
                        {client.services.length === 0 && (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const doneCount = client.services.filter(
                          (s) => s.status === "completed" || s.status === "done"
                        ).length;
                        const totalCount = client.services.length;
                        const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                        return (
                          <div className="flex items-center gap-2 max-w-[120px]">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-700">{pct}%</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {client.assigned_employee?.name || (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isAdmin ? (
                        <button
                          onClick={() => toggleStatus.mutate(client.id)}
                          className="focus:outline-none hover:scale-105 active:scale-95 transition-transform"
                          title="Click to toggle status (Active / Dormant)"
                        >
                          <Badge status={client.status} />
                        </button>
                      ) : (
                        <Badge status={client.status} />
                      )}
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="p-1.5 hover:bg-blue-50 text-blue-600 hover:text-blue-800 rounded-lg transition-all focus:outline-none"
                          title="View Client Details"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to permanently delete "${client.business_name}"? All associated services, tasks, and documents will be deleted permanently.`)) {
                                deleteMutation.mutate(client.id);
                              }
                            }}
                            className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-all focus:outline-none"
                            title="Delete Client"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <AddClientModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            qc.invalidateQueries({ queryKey: ["clients"] });
          }}
        />
      )}
    </Layout>
  );
}

// ── ADD CLIENT MODAL ──────────────────────────────────────────────────────────

function AddClientModal({ onClose, onSuccess }) {
  const [activeSection, setActiveSection] = useState("basic");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [showPasswords, setShowPasswords] = useState({});
  const [error, setError] = useState("");
  const [captchaImage, setCaptchaImage] = useState(null);
  const [captchaText, setCaptchaText] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [showCaptcha, setShowCaptcha] = useState(false);

  const [form, setForm] = useState({
    business_name: "",
    contact_person: "",
    contact_name: "",
    mobile: "",
    email: "",
    address: "",
    gstin: "",
    gst_username: "",
    gst_password: "",
    eway_bill_id: "",
    einvoice_id: "",
    gstin_status: "",
    registration_date: "",
    constitution: "",
    taxpayer_type: "",
    principal_place: "",
    business_activity: "",
    filing_type: "",
    pan: "",
    tan: "",
    aadhaar_number: "",
    it_login_id: "",
    it_password: "",
    tds_login_id: "",
    tds_password: "",
    traces_id: "",
    traces_password: "",
    iec_code: "",
    iec_password: "",
    lut_number: "",
    udyam_number: "",
    udyam_id: "",
    udyam_password: "",
    gumasta: "",
    gumasta_id: "",
    gumasta_password: "",
    food_license: "",
    food_license_id: "",
    food_license_password: "",
    trademark: "",
    trademark_id: "",
    trademark_password: "",
    roc_id: "",
    roc_password: "",
    ptrc_number: "",
    ptrc_id: "",
    ptrc_password: "",
    ptec_number: "",
    ptec_id: "",
    ptec_password: "",
    directors: [],
    // GST Filing Return Statuses (Current Year)
    gstr1_iff_status: "",
    gstr3b_status: "",
    gstr4_status: "",
    cmp08_status: "",
    gstr4_annual_status: "",
    gstr9_annual_status: "",
    gstr9c_status: "",
    gstr1a_status: "",
    // GST Filing Return Statuses (Previous Year)
    gstr1_iff_status_prev: "",
    gstr3b_status_prev: "",
    gstr4_status_prev: "",
    cmp08_status_prev: "",
    gstr4_annual_status_prev: "",
    gstr9_annual_status_prev: "",
    gstr9c_status_prev: "",
    gstr1a_status_prev: "",
  });

  const [selectedYear, setSelectedYear] = useState("current");

  const mutation = useMutation({
    mutationFn: () => createClient(form),
    onSuccess,
    onError: (err) =>
      setError(err.response?.data?.detail || "Failed to create client"),
  });

  const set = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const togglePass = (field) =>
    setShowPasswords((p) => ({ ...p, [field]: !p[field] }));

  const fetchGSTDetails = async () => {
    if (!form.gstin || form.gstin.length !== 15) {
      setFetchError("Enter a valid 15-digit GSTIN first");
      return;
    }
    setFetching(true);
    setFetchError("");
    try {
      const { getGstCaptcha } = await import("../../api");
      const data = await getGstCaptcha(form.gstin);
      setCaptchaImage(data.captcha_image);
      setSessionId(data.session_id);
      setShowCaptcha(true);
      setForm((p) => ({ ...p, pan: form.gstin.substring(2, 12) }));
    } catch (err) {
      setFetchError("Could not reach GST portal — PAN extracted from GSTIN");
      setForm((p) => ({ ...p, pan: form.gstin.substring(2, 12) }));
    } finally {
      setFetching(false);
    }
  };

  const submitCaptcha = async () => {
    if (!captchaText) return;
    setFetching(true);
    try {
      const { verifyGstCaptcha } = await import("../../api");
      const result = await verifyGstCaptcha(sessionId, captchaText);
      console.log("FULL GST RESPONSE:");
      console.log(result);
      console.log("GST DATA:");
      console.log(result.data);
      if (result.success && result.data) {
        console.log("FILINGS:", d.filings);
        setForm((p) => ({
          ...p,

          // Basic tab
          business_name: d.trade_name || d.legal_name || p.business_name,
          contact_person: d.legal_name || p.contact_person,
          contact_name: d.legal_name || p.contact_name,
          address: d.principal_place || p.address,

          // GST tab fields
          gstin_status: d.status || "",

          constitution: d.constitution || "",

          registration_date: d.registration_date || "",

          taxpayer_type: d.taxpayer_type || "",

          filing_type: d.filing_type || "",

          principal_place: d.principal_place || "",

          business_activity: d.business_activity || "",
        }));

        // Populate filing return statuses (current and previous)
        if (d.filings) {
          const f = d.filings;
          const cur = f.current ? f.current : f;
          const prev = f.previous ? f.previous : {};
          setForm((p) => ({
            ...p,
            gstr1_iff_status: cur.gstr1_iff?.status || "N/A",
            gstr3b_status: cur.gstr3b?.status || "N/A",
            gstr4_status: cur.gstr4?.status || "N/A",
            cmp08_status: cur.cmp08?.status || "N/A",
            gstr4_annual_status: cur.gstr4_annual?.status || "N/A",
            gstr9_annual_status: cur.gstr9_annual?.status || "N/A",
            gstr9c_status: cur.gstr9c?.status || "N/A",
            gstr1a_status: cur.gstr1a?.status || "N/A",
            gstr1_iff_status_prev: prev.gstr1_iff?.status || "N/A",
            gstr3b_status_prev: prev.gstr3b?.status || "N/A",
            gstr4_status_prev: prev.gstr4?.status || "N/A",
            cmp08_status_prev: prev.cmp08?.status || "N/A",
            gstr4_annual_status_prev: prev.gstr4_annual?.status || "N/A",
            gstr9_annual_status_prev: prev.gstr9_annual?.status || "N/A",
            gstr9c_status_prev: prev.gstr9c?.status || "N/A",
            gstr1a_status_prev: prev.gstr1a?.status || "N/A",
          }));
        }

        setFetchError(
          `✓ Fetched: ${d.legal_name || d.trade_name || "Details loaded"}`,
        );
      } else {
        setFetchError("Wrong CAPTCHA — try fetching again");
      }
    } catch (err) {
      setFetchError("Wrong CAPTCHA — try fetching again");
    } finally {
      setFetching(false);
      setShowCaptcha(false);
      setCaptchaImage(null);
      setCaptchaText("");
      setSessionId(null);
    }
  };

  const sections = [
    { key: "basic", label: "Basic Info" },
    { key: "gst", label: "GST & Tax" },
    { key: "direct", label: "Direct Tax" },
    { key: "iec", label: "IEC" },
    { key: "reg", label: "Certificates" },
    { key: "ptrc", label: "PTRC / PTEC" },
    { key: "roc", label: "ROC / MCA" },
    { key: "filings", label: "GST Returns" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-sm font-semibold text-gray-900">
            Add New Client
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex gap-0 border-b border-gray-100 px-6 flex-shrink-0 overflow-x-auto">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeSection === s.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="bg-red-50 text-red-700 text-xs rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          {activeSection === "basic" && (
            <div className="space-y-4">
              <SectionTitle title="Basic Information" />
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    GSTIN
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={form.gstin}
                      onChange={set("gstin")}
                      placeholder="27AAPCS1234A1Z5"
                      maxLength={15}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg
                 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                    <button
                      onClick={fetchGSTDetails}
                      disabled={fetching}
                      className="px-4 py-2 text-xs bg-green-600 text-white rounded-lg
                 hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                    >
                      {fetching ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        "Fetch from GST Portal"
                      )}
                    </button>
                  </div>
                  {fetchError && (
                    <p className="text-xs text-amber-600 mt-1">{fetchError}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Enter GSTIN and click Fetch — auto-fills name, PAN, address
                    and more
                  </p>

                  {showCaptcha && (
                    <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3 mt-3">
                      <p className="text-xs font-medium text-blue-800">
                        Enter the CAPTCHA to fetch GST details
                      </p>
                      {captchaImage && (
                        <img
                          src={captchaImage}
                          alt="GST CAPTCHA"
                          className="border border-gray-200 rounded-lg bg-white p-2"
                        />
                      )}
                      <div className="flex gap-2">
                        <input
                          value={captchaText}
                          onChange={(e) => setCaptchaText(e.target.value)}
                          placeholder="Type CAPTCHA text here"
                          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyDown={(e) =>
                            e.key === "Enter" && submitCaptcha()
                          }
                          autoFocus
                        />
                        <button
                          onClick={submitCaptcha}
                          disabled={!captchaText || fetching}
                          className="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg
                     hover:bg-blue-700 disabled:opacity-50"
                        >
                          {fetching ? "Verifying..." : "Submit"}
                        </button>
                        <button
                          onClick={() => {
                            setShowCaptcha(false);
                            setCaptchaImage(null);
                            setCaptchaText("");
                          }}
                          className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <Field
                  label="Company / Business Name *"
                  value={form.business_name}
                  onChange={set("business_name")}
                  required
                  span={2}
                />
                <Field
                  label="Contact Person Name"
                  value={form.contact_person}
                  onChange={set("contact_person")}
                />
                <Field
                  label="Proprietor / Director Name"
                  value={form.contact_name}
                  onChange={set("contact_name")}
                />
                <Field
                  label="Mobile Number"
                  value={form.mobile}
                  onChange={set("mobile")}
                  type="tel"
                />
                <Field
                  label="Email Address"
                  value={form.email}
                  onChange={set("email")}
                  type="email"
                />
                <Field
                  label="Aadhaar Number"
                  value={form.aadhaar_number}
                  onChange={set("aadhaar_number")}
                />
                <Field
                  label="Address"
                  value={form.address}
                  onChange={set("address")}
                  span={2}
                  multiline
                />
              </div>

              {/* Directors Section Inline */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <SectionTitle title="Directors / Partners" />
                  <button
                    onClick={() =>
                      setForm((p) => ({
                        ...p,
                        directors: [
                          ...p.directors,
                          { name: "", pan: "", email: "", mobile: "", din: "" },
                        ],
                      }))
                    }
                    className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                    Add Director / Partner
                  </button>
                </div>

                {form.directors.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 border border-gray-100 rounded-xl">
                    <p className="text-xs text-gray-500 mb-2">No directors/partners added yet.</p>
                    <p className="text-xs text-gray-400">Click the "Add Director / Partner" button to add one.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {form.directors.map((director, index) => (
                      <div key={index} className="relative p-4 border border-gray-200 rounded-xl bg-gray-50">
                        <button
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              directors: p.directors.filter((_, i) => i !== index),
                            }))
                          }
                          className="absolute top-3 right-3 text-red-500 hover:text-red-700 bg-white rounded-full p-1 shadow-sm transition-colors"
                          title="Remove"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                        <h4 className="text-xs font-semibold text-gray-700 mb-3">Member #{index + 1}</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <Field
                            label="Full Name *"
                            value={director.name}
                            onChange={(e) => {
                              const newDirectors = [...form.directors];
                              newDirectors[index].name = e.target.value;
                              setForm({ ...form, directors: newDirectors });
                            }}
                            span={2}
                          />
                          <Field
                            label="PAN"
                            value={director.pan}
                            onChange={(e) => {
                              const newDirectors = [...form.directors];
                              newDirectors[index].pan = e.target.value;
                              setForm({ ...form, directors: newDirectors });
                            }}
                            maxLength={10}
                          />
                          <Field
                            label="DIN Number"
                            value={director.din}
                            onChange={(e) => {
                              const newDirectors = [...form.directors];
                              newDirectors[index].din = e.target.value;
                              setForm({ ...form, directors: newDirectors });
                            }}
                          />
                          <Field
                            label="Email Address"
                            value={director.email}
                            onChange={(e) => {
                              const newDirectors = [...form.directors];
                              newDirectors[index].email = e.target.value;
                              setForm({ ...form, directors: newDirectors });
                            }}
                            type="email"
                          />
                          <Field
                            label="Mobile Number"
                            value={director.mobile}
                            onChange={(e) => {
                              const newDirectors = [...form.directors];
                              newDirectors[index].mobile = e.target.value;
                              setForm({ ...form, directors: newDirectors });
                            }}
                            type="tel"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "gst" && (
            <div className="space-y-4">
              <SectionTitle title="GST & Indirect Tax" />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="GST Login ID"
                  value={form.gst_username}
                  onChange={set("gst_username")}
                />
                <PasswordField
                  label="GST Password"
                  field="gst_password"
                  value={form.gst_password}
                  onChange={set("gst_password")}
                  show={showPasswords["gst_password"]}
                  onToggle={() => togglePass("gst_password")}
                />
                <Field
                  label="E-Way Bill Login ID"
                  value={form.eway_bill_id}
                  onChange={set("eway_bill_id")}
                />
                <PasswordField
                  label="E-Way Bill Password"
                  field="eway_password"
                  value={form.eway_password}
                  onChange={set("eway_password")}
                  show={showPasswords["eway_password"]}
                  onToggle={() => togglePass("eway_password")}
                />
                <Field
                  label="E-Invoice Login ID"
                  value={form.einvoice_id}
                  onChange={set("einvoice_id")}
                />
                <PasswordField
                  label="E-Invoice Password"
                  field="einvoice_password"
                  value={form.einvoice_password}
                  onChange={set("einvoice_password")}
                  show={showPasswords["einvoice_password"]}
                  onToggle={() => togglePass("einvoice_password")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Field
                  label="GST Status"
                  value={form.gstin_status}
                  onChange={set("gstin_status")}
                />

                <Field
                  label="Constitution"
                  value={form.constitution}
                  onChange={set("constitution")}
                />

                <Field
                  label="Registration Date"
                  value={form.registration_date}
                  onChange={set("registration_date")}
                />

                <Field
                  label="Taxpayer Type"
                  value={form.taxpayer_type}
                  onChange={set("taxpayer_type")}
                />
                <Field
                  label="LUT Number"
                  value={form.lut_number}
                  onChange={set("lut_number")}
                  span={2}
                />
              </div>
            </div>
          )}

          {activeSection === "direct" && (
            <div className="space-y-4">
              <SectionTitle title="Direct Tax" />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="PAN"
                  value={form.pan}
                  onChange={set("pan")}
                  placeholder="AAPCS1234A"
                  maxLength={10}
                />
                <Field
                  label="TAN"
                  value={form.tan}
                  onChange={set("tan")}
                  placeholder="MUMS12345A"
                  maxLength={10}
                />
                <Field
                  label="Income Tax Login ID"
                  value={form.it_login_id}
                  onChange={set("it_login_id")}
                />
                <PasswordField
                  label="Income Tax Password"
                  field="it_password"
                  value={form.it_password}
                  onChange={set("it_password")}
                  show={showPasswords["it_password"]}
                  onToggle={() => togglePass("it_password")}
                />
                <Field
                  label="TDS Login ID"
                  value={form.tds_login_id}
                  onChange={set("tds_login_id")}
                />
                <PasswordField
                  label="TDS Password"
                  field="tds_password"
                  value={form.tds_password}
                  onChange={set("tds_password")}
                  show={showPasswords["tds_password"]}
                  onToggle={() => togglePass("tds_password")}
                />
                <Field
                  label="TRACES Login ID"
                  value={form.traces_id}
                  onChange={set("traces_id")}
                />

                <PasswordField
                  label="TRACES Password"
                  field="traces_password"
                  value={form.traces_password}
                  onChange={set("traces_password")}
                  show={showPasswords["traces_password"]}
                  onToggle={() => togglePass("traces_password")}
                />
              </div>
            </div>
          )}

          {activeSection === "iec" && (
            <div className="space-y-4">
              <SectionTitle title="Import Export Code" />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="IEC Code"
                  value={form.iec_code}
                  onChange={set("iec_code")}
                />
                <PasswordField
                  label="IEC Password"
                  field="iec_password"
                  value={form.iec_password}
                  onChange={set("iec_password")}
                  show={showPasswords["iec_password"]}
                  onToggle={() => togglePass("iec_password")}
                />
              </div>
            </div>
          )}

          {activeSection === "reg" && (
            <div className="space-y-4">
              <SectionTitle title="Certificates" />

              <div className="grid grid-cols-3 gap-3">
                {/* Gumasta */}
                <Field
                  label="Gumasta Number"
                  value={form.gumasta}
                  onChange={set("gumasta")}
                />
                <Field
                  label="Gumasta Login ID"
                  value={form.gumasta_id}
                  onChange={set("gumasta_id")}
                />
                <PasswordField
                  label="Gumasta Password"
                  field="gumasta_password"
                  value={form.gumasta_password}
                  onChange={set("gumasta_password")}
                  show={showPasswords["gumasta_password"]}
                  onToggle={() => togglePass("gumasta_password")}
                />

                {/* Food License */}
                <Field
                  label="Food License Number"
                  value={form.food_license}
                  onChange={set("food_license")}
                />
                <Field
                  label="Food License Login ID"
                  value={form.food_license_id}
                  onChange={set("food_license_id")}
                />
                <PasswordField
                  label="Food License Password"
                  field="food_license_password"
                  value={form.food_license_password}
                  onChange={set("food_license_password")}
                  show={showPasswords["food_license_password"]}
                  onToggle={() => togglePass("food_license_password")}
                />

                {/* Trademark */}
                <Field
                  label="Trademark Number"
                  value={form.trademark}
                  onChange={set("trademark")}
                />
                <Field
                  label="Trademark Login ID"
                  value={form.trademark_id}
                  onChange={set("trademark_id")}
                />
                <PasswordField
                  label="Trademark Password"
                  field="trademark_password"
                  value={form.trademark_password}
                  onChange={set("trademark_password")}
                  show={showPasswords["trademark_password"]}
                  onToggle={() => togglePass("trademark_password")}
                />

                {/* Udyam */}
                <Field
                  label="Udyam Number"
                  value={form.udyam_number}
                  onChange={set("udyam_number")}
                />
                <Field
                  label="Udyam Login ID"
                  value={form.udyam_id}
                  onChange={set("udyam_id")}
                />
              </div>
            </div>
          )}

          {activeSection === "roc" && (
            <div className="space-y-4">
              <SectionTitle title="ROC / MCA" />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="ROC / MCA Login ID"
                  value={form.roc_id}
                  onChange={set("roc_id")}
                />
                <PasswordField
                  label="ROC / MCA Password"
                  field="roc_password"
                  value={form.roc_password}
                  onChange={set("roc_password")}
                  show={showPasswords["roc_password"]}
                  onToggle={() => togglePass("roc_password")}
                />
              </div>
            </div>
          )}

          {activeSection === "filings" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  GST Return Status
                </p>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-500">Financial Year:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    <option value="current">Current Year</option>
                    <option value="previous">Previous Year</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-400 -mt-2">
                Filing statuses are auto-populated when you fetch from the GST
                Portal. These boxes are read-only.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <FilingStatusBox returnType="GSTR1 / IFF" status={selectedYear === "previous" ? form.gstr1_iff_status_prev : form.gstr1_iff_status} />
                <FilingStatusBox returnType="GSTR3B" status={selectedYear === "previous" ? form.gstr3b_status_prev : form.gstr3b_status} />
                <FilingStatusBox returnType="GSTR4" status={selectedYear === "previous" ? form.gstr4_status_prev : form.gstr4_status} />
                <FilingStatusBox returnType="CMP-08" status={selectedYear === "previous" ? form.cmp08_status_prev : form.cmp08_status} />
                <FilingStatusBox returnType="GSTR4 (Annual)" status={selectedYear === "previous" ? form.gstr4_annual_status_prev : form.gstr4_annual_status} />
                <FilingStatusBox returnType="GSTR9 (Annual)" status={selectedYear === "previous" ? form.gstr9_annual_status_prev : form.gstr9_annual_status} />
                <FilingStatusBox returnType="GSTR9C" status={selectedYear === "previous" ? form.gstr9c_status_prev : form.gstr9c_status} />
                <FilingStatusBox returnType="GSTR1A" status={selectedYear === "previous" ? form.gstr1a_status_prev : form.gstr1a_status} />
              </div>
            </div>
          )}



          {activeSection === "ptrc" && (
            <div className="space-y-4">
              <SectionTitle title="PTRC / PTEC" />

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="PTRC / PTEC Login ID"
                  value={form.ptrc_id}
                  onChange={set("ptrc_id")}
                />

                <PasswordField
                  label="PTRC / PTEC Password"
                  field="ptrc_password"
                  value={form.ptrc_password}
                  onChange={set("ptrc_password")}
                  show={showPasswords["ptrc_password"]}
                  onToggle={() => togglePass("ptrc_password")}
                />

                <Field
                  label="PTRC Number"
                  value={form.ptrc_number}
                  onChange={set("ptrc_number")}
                />

                <Field
                  label="PTEC Number"
                  value={form.ptec_number}
                  onChange={set("ptec_number")}
                />
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0 rounded-b-2xl">
          <button
            onClick={onClose}
            className="text-sm text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.business_name || mutation.isPending}
            className="text-sm bg-blue-600 text-white px-5 py-2 rounded-lg
                             hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? "Creating..." : "Create Client"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── REUSABLE FIELD COMPONENTS ─────────────────────────────────────────────────

function SectionTitle({ title }) {
  return (
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pb-1 border-b border-gray-100">
      {title}
    </p>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  span,
  multiline,
  maxLength,
}) {
  const cls = `w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
               focus:outline-none focus:ring-2 focus:ring-blue-500`;
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={onChange}
          rows={3}
          className={cls}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          maxLength={maxLength}
          className={cls}
        />
      )}
    </div>
  );
}

function PasswordField({
  label,
  field,
  value,
  onChange,
  show,
  onToggle,
  span,
}) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          className="w-full px-3 py-2 pr-9 text-sm border border-gray-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

function FilingStatusBox({ returnType, status }) {
  const s = (status || "").toLowerCase().trim();

  let borderColor, bgColor, textColor, emoji, label;

  if (s.includes("filed")) {
    borderColor = "border-emerald-300";
    bgColor = "bg-emerald-50/60";
    textColor = "text-emerald-700";
    emoji = "✅";
    label = "Filed";
  } else if (
    s.includes("pending") ||
    s.includes("not filed")
  ) {
    borderColor = "border-amber-300";
    bgColor = "bg-amber-50/60";
    textColor = "text-amber-700";
    emoji = "⏳";
    label = "Pending";
  } else {
    borderColor = "border-gray-200";
    bgColor = "bg-gray-50/60";
    textColor = "text-gray-400";
    emoji = "⚠️";
    label = status || "N/A";
  }

  return (
    <div
      className={`p-3 rounded-xl border-2 ${borderColor} ${bgColor} cursor-not-allowed select-none transition-all`}
    >
      <p className="text-xs font-bold text-gray-800 mb-1.5">
        {returnType}
      </p>

      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold ${textColor} px-2 py-0.5 rounded-full`}
      >
        <span>{emoji}</span>
        {label}
      </span>
    </div>
  );
}