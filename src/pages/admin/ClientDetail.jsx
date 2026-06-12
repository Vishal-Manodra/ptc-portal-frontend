// src/pages/admin/ClientDetail.jsx
// The most important page — shows everything about one client:
// their info, all services with progress, all documents, all tasks.
// Admin can upload docs, update service progress, add tasks here.

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "../../components/layout/Layout";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import { useAuth } from "../../context/AuthContext";
import {
  getClient,
  updateService,
  uploadDocument,
  deleteDocument,
  toggleDocVisibility,
  createTask,
  assignService,
  getServices,
  updateClient,
  fetchServiceDetails,
  deleteTask,
  getEmployees,
  getClientGstSummary,
  getClientWorkflowsByClient,
  getWorkflowTemplates,
  assignWorkflowToClient,
} from "../../api";

export default function ClientDetail() {
  const { id } = useParams(); // gets the :id from the URL /clients/1
  const navigate = useNavigate();
  const { user, isAdmin, isEmployee } = useAuth();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);

  const [selectedService, setSelectedService] = useState(null);

  const [showGstCaptcha, setShowGstCaptcha] = useState(false);
  const [gstCaptchaImage, setGstCaptchaImage] = useState(null);
  const [gstCaptchaText, setGstCaptchaText] = useState("");
  const [gstSessionId, setGstSessionId] = useState(null);
  const [gstFetching, setGstFetching] = useState(false);
  const [gstFetchError, setGstFetchError] = useState("");
  const [gstSummary, setGstSummary] = useState({});
  const [activeScraperPlaceholder, setActiveScraperPlaceholder] =
    useState(null);

  const servicesWithCredentials = [
    {
      key: "gst",
      label: "GST",
      numberLabel: "GSTIN",
      numberField: "gstin",
      idField: "gst_username",
      pwdField: "gst_password",
    },
    {
      key: "eway",
      label: "E-Way Bill",
      idField: "eway_bill_id",
      pwdField: "eway_password",
    },
    {
      key: "einvoice",
      label: "E-Invoice",
      idField: "einvoice_id",
      pwdField: "einvoice_password",
    },
    {
      key: "it",
      label: "Income Tax",
      numberLabel: "PAN",
      numberField: "pan",
      idField: "it_login_id",
      pwdField: "it_password",
    },
    {
      key: "tds",
      label: "TDS",
      numberLabel: "TAN",
      numberField: "tan",
      idField: "tds_login_id",
      pwdField: "tds_password",
    },
    {
      key: "traces",
      label: "TRACES",
      idField: "traces_id",
      pwdField: "traces_password",
    },
    {
      key: "iec",
      label: "IEC",
      numberLabel: "IEC Code",
      numberField: "iec_code",
      pwdField: "iec_password",
    },
    {
      key: "gumasta",
      label: "Gumasta",
      numberLabel: "Gumasta No",
      numberField: "gumasta",
      idField: "gumasta_id",
      pwdField: "gumasta_password",
    },
    {
      key: "food",
      label: "Food License",
      numberLabel: "License No",
      numberField: "food_license",
      idField: "food_license_id",
      pwdField: "food_license_password",
    },
    {
      key: "trademark",
      label: "Trademark",
      numberLabel: "Trademark No",
      numberField: "trademark",
      idField: "trademark_id",
      pwdField: "trademark_password",
    },
    {
      key: "roc",
      label: "ROC / MCA",
      idField: "roc_id",
      pwdField: "roc_password",
    },
    {
      key: "ptrc",
      label: "PTRC / PTEC",
      numberLabel: "PTRC / PTEC No",
      numberField: "ptrc_number",
      idField: "ptrc_id",
      pwdField: "ptrc_password",
    },
    {
      key: "udyam",
      label: "Udyam",
      numberLabel: "Udyam No",
      numberField: "udyam_number",
      idField: "udyam_id",
      pwdField: "udyam_password",
    },
    {
      key: "aadhaar",
      label: "Aadhaar",
      numberLabel: "Aadhaar No",
      numberField: "aadhaar_number",
    },
  ];

  const hasCredentials = (service) => {
    const hasNum = service.numberField && client[service.numberField];
    const hasId = service.idField && client[service.idField];
    const hasPwd = service.pwdField && client[service.pwdField];
    return !!(hasNum || hasId || hasPwd);
  };

  const startGstFetch = async () => {
    if (!client.gstin) {
      alert("Please add a GSTIN to this client first.");
      return;
    }
    setGstFetching(true);
    setGstFetchError("");
    try {
      const { getGstCaptcha } = await import("../../api");
      const data = await getGstCaptcha(client.gstin);
      setGstCaptchaImage(data.captcha_image);
      setGstSessionId(data.session_id);
      setShowGstCaptcha(true);
    } catch (err) {
      setGstFetchError("Could not reach GST portal. Please try again.");
    } finally {
      setGstFetching(false);
    }
  };

  const submitGstCaptcha = async () => {
    if (!gstCaptchaText) return;
    setGstFetching(true);
    try {
      const { verifyGstCaptcha } = await import("../../api");
      const result = await verifyGstCaptcha(
        gstSessionId,
        gstCaptchaText,
        client.id,
      );
      if (result.success && result.data) {
        const d = result.data;
        const updatedFields = {
          business_name: d.trade_name || d.legal_name || client.business_name,
          contact_person: d.legal_name || client.contact_person,
          address: d.principal_place || client.address,
          gstin_status: d.status || "",
          constitution: d.constitution || "",
          registration_date: d.registration_date || "",
          taxpayer_type: d.taxpayer_type || "",
          filing_type: d.filing_type || "",
          principal_place: d.principal_place || "",
          business_activity: d.business_activity || "",
        };

        await updateClient(client.id, updatedFields);
        qc.invalidateQueries({ queryKey: ["client", id] });
        setShowGstCaptcha(false);
        setGstCaptchaImage(null);
        setGstCaptchaText("");
        setGstSessionId(null);
        alert("✓ Client details successfully updated from GST Portal!");
      } else {
        setGstFetchError("Wrong CAPTCHA — please try again");
      }
    } catch (err) {
      setGstFetchError(
        "Wrong CAPTCHA or Verification Error — please try again",
      );
    } finally {
      setGstFetching(false);
    }
  };

  const handleFetchService = async (service) => {
    if (service.key === "gst") {
      startGstFetch();
      return;
    }

    setGstFetching(true);
    try {
      const res = await fetchServiceDetails(id, service.key);
      if (res.success) {
        qc.invalidateQueries({ queryKey: ["client", id] });
        alert(
          res.message || `✓ Details successfully fetched for ${service.label}!`,
        );
      }
    } catch (err) {
      alert(
        err.response?.data?.detail ||
          `Failed to fetch details for ${service.label}.`,
      );
    } finally {
      setGstFetching(false);
    }
  };

  const {
    data: client,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["client", id],
    queryFn: () => getClient(id),
  });
  useEffect(() => {
    if (!client?.id) return;

    getClientGstSummary(client.id)
      .then((data) => {
        console.log("GST SUMMARY:", data);
        setGstSummary(data);
      })
      .catch((err) => {
        console.error("GST SUMMARY ERROR:", err);
      });
  }, [client?.id]);
  const { data: workflows = [] } = useQuery({
    queryKey: ["client-workflows", id],
    queryFn: () => getClientWorkflowsByClient(id),
  });
  const { data: templates = [] } = useQuery({
    queryKey: ["workflow-templates"],
    queryFn: getWorkflowTemplates,
  });
  const [feesAmount, setFeesAmount] = useState(client?.fees || "");
  const [feesLoading, setFeesLoading] = useState(false);
  const [feesSaved, setFeesSaved] = useState(false);

  const canEditService =
    isAdmin ||
    (isEmployee &&
      (client?.assigned_employee?.id === user?.id ||
        client?.assigned_employee_id === user?.id));

  useEffect(() => {
    if (client && client.fees !== undefined) {
      setFeesAmount(client.fees);
    }
  }, [client]);

  const { data: allServices = [] } = useQuery({
    queryKey: ["services"],
    queryFn: getServices,
    enabled: isAdmin, // only fetch if admin (they're the only one who assigns services)
  });

  const updateProgress = useMutation({
    mutationFn: ({ csId, data }) => updateService(csId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client", id] }),
  });

  const removeDoc = useMutation({
    mutationFn: (docId) => deleteDocument(docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client", id] }),
  });

  const toggleVisibility = useMutation({
    mutationFn: (docId) => toggleDocVisibility(docId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client", id] }),
  });

  const addService = useMutation({
    mutationFn: (serviceId) => assignService(id, serviceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client", id] }),
  });

  // File upload handler
  const handleFileUpload = async (file, clientServiceId = null) => {
    if (!file) return;
    setUploadingFile(true);
    setUploadError("");
    try {
      await uploadDocument(id, file, { clientServiceId });
      qc.invalidateQueries({ queryKey: ["client", id] });
    } catch (err) {
      setUploadError(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploadingFile(false);
    }
  };
  const handleSaveFees = async () => {
    if (!feesAmount || feesAmount === "") {
      alert("Please enter a fees amount");
      return;
    }
    setFeesLoading(true);
    try {
      await updateClient(id, { fees: parseFloat(feesAmount) || 0 });
      setFeesSaved(true);
      setTimeout(() => setFeesSaved(false), 2000);
      qc.invalidateQueries({ queryKey: ["client", id] });
    } catch (err) {
      console.error("Failed to save fees:", err);
      alert(err.response?.data?.detail || "Failed to save fees");
    } finally {
      setFeesLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout title="Client Detail">
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      </Layout>
    );
  }

  if (error || !client) {
    return (
      <Layout title="Client Detail">
        <div className="text-center py-20">
          <p className="text-gray-500">Client not found.</p>
          <button
            onClick={() => navigate("/clients")}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Back to clients
          </button>
        </div>
      </Layout>
    );
  }

  // Services not yet assigned to this client (for the "Add Service" dropdown)
  const assignedServiceIds = client.services.map((cs) => cs.service.id);
  const availableServices = allServices.filter(
    (s) => !assignedServiceIds.includes(s.id),
  );

  const completedServicesCount = client.services.filter(
    (s) => s.status === "completed" || s.status === "done",
  ).length;
  const totalServicesCount = client.services.length;
  const overallProgress =
    totalServicesCount > 0
      ? Math.round((completedServicesCount / totalServicesCount) * 100)
      : 0;

  return (
    <Layout title={client.business_name}>
      {/* Back button + header */}
      <div className="mb-5">
        <button
          onClick={() => navigate("/clients")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Clients
        </button>

        {/* Credentials Pills Row */}
        <div className="flex flex-wrap gap-2 mb-4 mt-2">
          {servicesWithCredentials.map((service) => (
            <button
              key={service.key}
              onClick={() => {
                setSelectedService(
                  selectedService === service.key ? null : service.key,
                );
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 select-none ${
                selectedService === service.key
                  ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100 scale-[1.03]"
                  : hasCredentials(service)
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100/70"
                    : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100/70 opacity-60"
              }`}
            >
              {hasCredentials(service) && selectedService !== service.key && (
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              )}
              {service.label}
            </button>
          ))}
        </div>

        {/* Credentials Info Panel */}
        {selectedService &&
          (() => {
            const service = servicesWithCredentials.find(
              (s) => s.key === selectedService,
            );
            if (!service) return null;

            const numVal = service.numberField
              ? client[service.numberField]
              : null;
            const idVal = service.idField ? client[service.idField] : null;
            const pwdVal = service.pwdField ? client[service.pwdField] : null;

            return (
              <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100 rounded-2xl p-5 mb-5 shadow-sm transition-all duration-300 animate-fadeIn">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
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
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </span>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {service.label} Credentials
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFetchService(service)}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 shadow-sm font-semibold transition-colors"
                    >
                      {gstFetching && service.key === "gst" ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17"
                          />
                        </svg>
                      )}
                      <span>Fetch Details</span>
                    </button>
                    <button
                      onClick={() => setSelectedService(null)}
                      className="text-gray-400 hover:text-gray-600 p-1 hover:bg-white rounded-full transition-colors"
                    >
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {service.numberField && (
                    <CredentialField
                      label={service.numberLabel || "Number"}
                      value={numVal}
                      placeholder="Not set"
                    />
                  )}

                  {service.idField && (
                    <CredentialField
                      label="Login ID / Username"
                      value={idVal}
                      placeholder="Not set"
                    />
                  )}

                  {service.pwdField && (
                    <CredentialField
                      label="Password"
                      value={pwdVal}
                      placeholder="Not set"
                      isPassword
                    />
                  )}
                </div>
              </div>
            );
          })()}

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {client.business_name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge status={client.status} />
              {client.gstin && (
                <span className="text-xs text-gray-900">
                  GSTIN: {client.gstin}
                </span>
              )}
              {client.pan && (
                <span className="text-xs text-gray-900">PAN: {client.pan}</span>
              )}
              {client.aadhaar_number && (
                <span className="text-xs text-gray-900">
                  AADHAAR: {client.aadhaar_number}
                </span>
              )}
              {client.mobile && (
                <span className="text-xs text-gray-900">
                  PHONE: {client.mobile}
                </span>
              )}
              {client.email && (
                <span className="text-xs text-gray-900">
                  EMAIL: {client.email}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Info cards row */}
      {/* Client details */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Client Information
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 text-sm">
          {[
            ["Contact Person", client.contact_person],
            ["Proprietor", client.contact_name],
            ["Constitution", client.constitution],
            ["PTRC No", client.ptrc_number],
            ["PTEC No", client.ptec_number],
            ["TAN", client.tan],
            ["LUT", client.lut_number],
            ["Address", client.address],
            ["Assigned To", client.assigned_employee?.name],
          ]
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label}>
                <p className="text-gray-500 text-xs">{label}</p>

                <p className="font-medium text-gray-900 break-words">{value}</p>
              </div>
            ))}
        </div>

        {client.directors?.length > 0 && (
          <div className="mt-6 pt-5 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Directors / Partners
            </h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500 text-xs">
                  <tr>
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">PAN</th>
                    <th className="px-4 py-2 font-medium">DIN</th>
                    <th className="px-4 py-2 font-medium">Email</th>
                    <th className="px-4 py-2 font-medium">Mobile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {client.directors.map((d, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-900 font-medium">
                        {d.name}
                      </td>
                      <td className="px-4 py-2 text-gray-600 font-mono text-xs">
                        {d.pan || "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-600 font-mono text-xs">
                        {d.din || "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {d.email || "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {d.mobile || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      {/* Fees field - inline on a single line with matching left padding */}
      {isAdmin && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-3 animate-fadeIn pl-4">
          <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider select-none">
            Fees:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={feesAmount}
              onChange={(e) => setFeesAmount(e.target.value)}
              placeholder="0"
              className="text-sm font-semibold text-gray-900 border border-gray-200 rounded px-2.5 py-1 w-28
                         focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
            <button
              onClick={handleSaveFees}
              disabled={feesLoading}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg font-bold shadow-sm
                         hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all select-none"
            >
              {feesLoading ? "..." : feesSaved ? "Saved ✓" : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Tab navigation & Overall Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-200 mb-5 gap-3 sm:gap-4 md:gap-6 pb-1 sm:pb-0">
        <div className="flex gap-1 -mb-px flex-shrink-0">
          {[
            {
              key: "overview",
              label: `Services (${overallProgress}%)`,
            },
            {
              key: "documents",
              label: `Documents (${client.documents.length})`,
            },
            {
              key: "tasks",
              label: `Tasks (${client.tasks.length})`,
            },
            {
              key: "workflows",
              label: `Workflows (${workflows.length})`,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200 select-none ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overall Services Completion Progress Bar on the top right */}
        {client.services.length > 0 && (
          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border border-blue-100/50 rounded-xl px-3 py-1.5 shadow-sm flex-1 w-full animate-fadeIn mb-1 min-w-0 sm:ml-2">
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center text-[10px] font-extrabold text-blue-800 mb-1 select-none">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  Overall Progress
                </span>
                <span>{overallProgress}%</span>
              </div>
              <div className="h-2 bg-gray-200/80 rounded-full overflow-hidden shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-100 text-blue-700 flex-shrink-0 select-none shadow-sm">
              {completedServicesCount}/{totalServicesCount} Done
            </span>
          </div>
        )}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <OverviewTab
          client={client}
          isAdmin={isAdmin}
          canEditService={canEditService}
          availableServices={availableServices}
          onUpdateProgress={(csId, data) =>
            updateProgress.mutate({ csId, data })
          }
          onAddService={(serviceId) => addService.mutate(serviceId)}
        />
      )}

      {activeTab === "documents" && (
        <DocumentsTab
          client={client}
          isAdmin={isAdmin}
          uploadingFile={uploadingFile}
          uploadError={uploadError}
          onUpload={handleFileUpload}
          onDelete={(docId) => removeDoc.mutate(docId)}
          onToggleVisibility={(docId) => toggleVisibility.mutate(docId)}
          servicesWithCredentials={servicesWithCredentials}
          hasCredentials={hasCredentials}
        />
      )}

      {activeTab === "tasks" && (
        <TasksTab
          client={client}
          isAdmin={isAdmin}
          onRefresh={() => qc.invalidateQueries({ queryKey: ["client", id] })}
        />
      )}
      {activeTab === "workflows" && (
        <WorkflowsTab
          workflows={workflows}
          isAdmin={isAdmin}
          onAssign={() => setShowWorkflowModal(true)}
        />
      )}
      {showEditModal && (
        <EditClientModal
          client={client}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            qc.invalidateQueries({ queryKey: ["client", id] });
            qc.invalidateQueries({ queryKey: ["clients"] });
          }}
        />
      )}

      {/* GST Captcha Modal */}
      {showGstCaptcha && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-scaleIn">
            <button
              onClick={() => {
                setShowGstCaptcha(false);
                setGstCaptchaImage(null);
                setGstCaptchaText("");
                setGstSessionId(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
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

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-green-50 text-green-700 rounded-lg text-sm">
                  ⚡
                </span>
                <h3 className="text-base font-semibold text-gray-900">
                  GST Captcha Verification
                </h3>
              </div>
              <p className="text-xs text-gray-500">
                Enter the CAPTCHA code shown below to pull active registration
                details for <strong>{client.business_name}</strong> (GSTIN:{" "}
                {client.gstin}).
              </p>

              {gstFetchError && (
                <div className="bg-red-50 text-red-700 text-xs rounded-lg p-2.5">
                  {gstFetchError}
                </div>
              )}

              {gstCaptchaImage && (
                <img
                  src={gstCaptchaImage}
                  alt="GST CAPTCHA"
                  className="border border-gray-200 rounded-xl bg-white p-3 mx-auto shadow-sm"
                />
              )}

              <div className="flex gap-2">
                <input
                  value={gstCaptchaText}
                  onChange={(e) => setGstCaptchaText(e.target.value)}
                  placeholder="Type CAPTCHA text"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === "Enter" && submitGstCaptcha()}
                  autoFocus
                />
                <button
                  onClick={submitGstCaptcha}
                  disabled={!gstCaptchaText || gstFetching}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
                >
                  {gstFetching ? "Verifying..." : "Verify"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scraper Placeholder Modal */}
      {activeScraperPlaceholder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-scaleIn">
            <button
              onClick={() => setActiveScraperPlaceholder(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
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

            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-xl">
                🤖
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                {activeScraperPlaceholder.label} Scraper Integration
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                The automatic fetch utility for{" "}
                <strong>{activeScraperPlaceholder.label}</strong> is currently
                in development.
              </p>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-left text-xs text-gray-600 space-y-2">
                <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  Planned Scraper Flow:
                </p>
                <ul className="list-disc list-inside pl-1 space-y-1 text-gray-500">
                  <li>Establish session using stored login credentials</li>
                  <li>Bypass captcha using secure verification</li>
                  <li>Pull latest active license details and status</li>
                  <li>Auto-populate database & sync dashboard</li>
                </ul>
              </div>
              <button
                onClick={() => setActiveScraperPlaceholder(null)}
                className="w-full bg-blue-600 text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
      {showWorkflowModal && (
        <AssignWorkflowModal
          clientId={id}
          templates={templates}
          onClose={() => setShowWorkflowModal(false)}
          onSuccess={() => {
            qc.invalidateQueries({
              queryKey: ["client-workflows", id],
            });

            setShowWorkflowModal(false);
          }}
        />
      )}
    </Layout>
  );
}
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
  const cls = `w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`;
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
          className="w-full px-3 py-2 pr-9 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

// ── OVERVIEW TAB ──────────────────────────────────────────────────────────────

function OverviewTab({
  client,
  isAdmin,
  canEditService,
  availableServices,
  onUpdateProgress,
  onAddService,
}) {
  const completedServicesCount = client.services.filter(
    (s) => s.status === "completed" || s.status === "done",
  ).length;
  const totalServicesCount = client.services.length;
  const overallProgress =
    totalServicesCount > 0
      ? Math.round((completedServicesCount / totalServicesCount) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end mb-2">
        {isAdmin && availableServices.length > 0 && (
          <select
            onChange={(e) => {
              if (e.target.value) {
                onAddService(e.target.value);
                e.target.value = "";
              }
            }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">+ Assign Service</option>
            {availableServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {client.services.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-10 text-center">
          <p className="text-sm text-gray-500">No services assigned yet.</p>
        </div>
      ) : (
        client.services.map((cs) => (
          <ServiceCard
            key={cs.id}
            cs={cs}
            isAdmin={isAdmin}
            canEditService={canEditService}
            onUpdate={(data) => onUpdateProgress(cs.id, data)}
          />
        ))
      )}
    </div>
  );
}

function ServiceCard({ cs, isAdmin, canEditService, onUpdate }) {
  const [status, setStatus] = useState(cs.status);
  const [saving, setSaving] = useState(false);

  const handleToggle = async (e) => {
    if (e) e.stopPropagation();
    if (!canEditService || saving) return;

    const newStatus = status === "completed" ? "pending" : "completed";
    setStatus(newStatus);
    setSaving(true);
    try {
      const automaticProgress = newStatus === "completed" ? 100 : 0;
      await onUpdate({ progress: automaticProgress, status: newStatus });
    } catch (err) {
      console.error("Save failed", err);
      // Revert if API fails
      setStatus(status);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-100 transition-colors shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">
              {cs.service.name}
            </h3>
            {canEditService ? (
              <button
                onClick={handleToggle}
                disabled={saving}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none transition-all duration-200 border cursor-pointer hover:scale-105 active:scale-95 ${
                  status === "completed"
                    ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100/70"
                    : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100/70"
                }`}
                title="Click to toggle status (Pending / Done)"
              >
                {saving ? (
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : status === "completed" ? (
                  <>
                    <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                    Done
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-pulse" />
                    Pending
                  </>
                )}
              </button>
            ) : (
              <Badge status={status === "completed" ? "done" : "pending"} />
            )}
          </div>
          {cs.due_date && (
            <p className="text-xs text-gray-400 mt-1.5">
              Due: {new Date(cs.due_date).toLocaleDateString("en-IN")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DOCUMENTS TAB ─────────────────────────────────────────────────────────────

function DocumentsTab({
  client,
  isAdmin,
  uploadingFile,
  uploadError,
  onUpload,
  onDelete,
  onToggleVisibility,
}) {
  const fileIcons = {
    pdf: "📄",
    xlsx: "📊",
    xls: "📊",
    docx: "📝",
    doc: "📝",
    jpg: "🖼",
    jpeg: "🖼",
    png: "🖼",
    csv: "📊",
  };

  const customSections = [
    { key: "kyc", label: "KYC", icon: "🆔" },
    { key: "itr", label: "ITR", icon: "🏦" },
    { key: "cert", label: "Certificates", icon: "📜" },
  ];

  // Helper to identify category of a document based on its client_service_id OR filename keywords
  const getCategoryForDocument = (doc) => {
    const fileNameLower = doc.file_name.toLowerCase();

    // 1. Direct prefixes check
    if (fileNameLower.startsWith("kyc_")) return "kyc";
    if (fileNameLower.startsWith("itr_")) return "itr";
    if (fileNameLower.startsWith("cert_")) return "cert";

    // Keyword search arrays
    const kycKeywords = [
      "kyc",
      "pan",
      "aadhaar",
      "aadhar",
      "passport",
      "voter",
      "profile",
      "photo",
      "sign",
      "signature",
      "address",
      "utility",
      "bill",
    ];
    const itrKeywords = [
      "itr",
      "it",
      "income tax",
      "computation",
      "acknowledgement",
      "ack",
      "form 16",
      "form16",
      "26as",
      "traces",
      "tds",
    ];
    const certKeywords = [
      "certificate",
      "cert",
      "license",
      "registration",
      "gst",
      "gumasta",
      "udyam",
      "msme",
      "iec",
      "food",
      "fssai",
      "trademark",
      "roc",
      "incorporation",
      "mca",
    ];

    // 2. Filename keyword checks
    if (kycKeywords.some((kw) => fileNameLower.includes(kw))) return "kyc";
    if (itrKeywords.some((kw) => fileNameLower.includes(kw))) return "itr";
    if (certKeywords.some((kw) => fileNameLower.includes(kw))) return "cert";

    // 3. Database client_service name checks
    if (doc.client_service_id) {
      const cs = client.services.find((s) => s.id === doc.client_service_id);
      if (cs && cs.service) {
        const serviceName = cs.service.name.toLowerCase();
        if (kycKeywords.some((kw) => serviceName.includes(kw))) return "kyc";
        if (itrKeywords.some((kw) => serviceName.includes(kw))) return "itr";
        if (certKeywords.some((kw) => serviceName.includes(kw))) return "cert";
      }
    }

    return "general";
  };

  // Helper to find a matching active client_service_id for a category key to link DB relation if possible
  const getFirstActiveServiceIdForCategory = (categoryKey) => {
    const kycKeywords = [
      "kyc",
      "pan",
      "aadhaar",
      "aadhar",
      "passport",
      "voter",
      "profile",
      "photo",
      "sign",
      "signature",
      "address",
      "utility",
      "bill",
    ];
    const itrKeywords = [
      "itr",
      "it",
      "income tax",
      "computation",
      "acknowledgement",
      "ack",
      "form 16",
      "form16",
      "26as",
      "traces",
      "tds",
    ];
    const certKeywords = [
      "certificate",
      "cert",
      "license",
      "registration",
      "gst",
      "gumasta",
      "udyam",
      "msme",
      "iec",
      "food",
      "fssai",
      "trademark",
      "roc",
      "incorporation",
      "mca",
    ];

    let keywords = [];
    if (categoryKey === "kyc") keywords = kycKeywords;
    else if (categoryKey === "itr") keywords = itrKeywords;
    else if (categoryKey === "cert") keywords = certKeywords;

    const activeService = client.services.find((s) => {
      if (!s.service) return false;
      const name = s.service.name.toLowerCase();
      return keywords.some((kw) => name.includes(kw));
    });
    return activeService ? activeService.id : null;
  };

  // Format WhatsApp Number (clean non-digits, drop leading zero, add '91' for India)
  let waNum = (client.mobile || client.phone || "").replace(/\D/g, "");
  if (waNum.startsWith("0")) waNum = waNum.substring(1);
  if (waNum.length === 10) waNum = "91" + waNum;

  // Filter General Documents
  const generalDocs = client.documents.filter(
    (doc) => getCategoryForDocument(doc) === "general",
  );

  return (
    <div className="space-y-6">
      {uploadError && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl p-3.5 flex items-center justify-between animate-fadeIn">
          <span>⚠️ {uploadError}</span>
        </div>
      )}

      {/* 3 Dedicated subsections (KYC, ITR, Certificates) */}
      {customSections.map((section) => {
        const folderDocs = client.documents.filter(
          (doc) => getCategoryForDocument(doc) === section.key,
        );
        const csId = getFirstActiveServiceIdForCategory(section.key);
        return (
          <DocumentSection
            key={section.key}
            title={section.label}
            documents={folderDocs}
            csId={csId}
            serviceKey={section.key}
            isAdmin={isAdmin}
            uploadingFile={uploadingFile}
            onUpload={onUpload}
            onDelete={onDelete}
            onToggleVisibility={onToggleVisibility}
            waNum={waNum}
            clientName={client.contact_person || client.business_name}
            fileIcons={fileIcons}
          />
        );
      })}

      {/* General Documents fallback */}
      <DocumentSection
        title="General Documents"
        documents={generalDocs}
        csId={null}
        serviceKey="general"
        isAdmin={isAdmin}
        uploadingFile={uploadingFile}
        onUpload={onUpload}
        onDelete={onDelete}
        onToggleVisibility={onToggleVisibility}
        waNum={waNum}
        clientName={client.contact_person || client.business_name}
        fileIcons={fileIcons}
      />
    </div>
  );
}

function DocumentSection({
  title,
  documents,
  csId,
  serviceKey,
  isAdmin,
  uploadingFile,
  onUpload,
  onDelete,
  onToggleVisibility,
  waNum,
  clientName,
  fileIcons,
}) {
  // Emojis matching kyc, itr, certificates, and general folders
  const getEmojiIcon = (key) => {
    switch (key) {
      case "kyc":
        return "👤";
      case "itr":
        return "🏦";
      case "cert":
        return "📜";
      default:
        return "📁";
    }
  };

  // Pastel colored backgrounds for each folder category
  const getColors = (key) => {
    switch (key) {
      case "kyc":
        return {
          bg: "bg-rose-50/40",
          border: "border-rose-100",
          text: "text-rose-700",
          iconBg: "bg-rose-100/60",
        };
      case "itr":
        return {
          bg: "bg-teal-50/40",
          border: "border-teal-100",
          text: "text-teal-700",
          iconBg: "bg-teal-100/60",
        };
      case "cert":
        return {
          bg: "bg-blue-50/40",
          border: "border-blue-100",
          text: "text-blue-700",
          iconBg: "bg-blue-100/60",
        };
      default:
        return {
          bg: "bg-gray-50/40",
          border: "border-gray-100",
          text: "text-gray-700",
          iconBg: "bg-gray-100/60",
        };
    }
  };

  const colors = getColors(serviceKey);
  const iconEmoji = getEmojiIcon(serviceKey);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:border-gray-300">
      {/* Header Bar */}
      <div
        className={`flex items-center justify-between px-5 py-4 border-b border-gray-100 ${colors.bg}`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`p-2 rounded-xl text-lg font-semibold flex items-center justify-center ${colors.iconBg} ${colors.text}`}
          >
            {iconEmoji}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              {title}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-gray-100 text-gray-500 shadow-sm">
                {documents.length} {documents.length === 1 ? "File" : "Files"}
              </span>
            </h3>
          </div>
        </div>

        {isAdmin && (
          <div>
            <label
              htmlFor={`upload-input-${serviceKey || "general"}`}
              className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all border shadow-sm select-none
                ${
                  uploadingFile
                    ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white border-blue-200 text-blue-600 hover:bg-blue-50/50 hover:border-blue-300 hover:text-blue-700 active:scale-95"
                }`}
            >
              {uploadingFile ? (
                <>
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span>Add Document</span>
                </>
              )}
            </label>
            <input
              type="file"
              id={`upload-input-${serviceKey || "general"}`}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  // Prefix file name to lock in category categorization if database service_id is null
                  let fileToUpload = file;
                  if (serviceKey !== "general") {
                    const prefix = `${serviceKey.toUpperCase()}_`;
                    if (
                      !file.name
                        .toUpperCase()
                        .startsWith(serviceKey.toUpperCase())
                    ) {
                      fileToUpload = new File([file], `${prefix}${file.name}`, {
                        type: file.type,
                      });
                    }
                  }
                  onUpload(fileToUpload, csId);
                  e.target.value = ""; // Reset value so same file can be re-uploaded
                }
              }}
              disabled={uploadingFile}
              accept=".pdf,.xlsx,.xls,.docx,.doc,.jpg,.jpeg,.png,.csv,.txt"
            />
          </div>
        )}
      </div>

      {/* Body / Documents List */}
      {documents.length === 0 ? (
        <div className="px-5 py-8 text-center bg-gray-50/20">
          <div className="w-10 h-10 bg-gray-100/70 rounded-full flex items-center justify-center mx-auto mb-2.5 text-gray-400 text-base">
            📂
          </div>
          <p className="text-xs font-medium text-gray-500">
            No documents uploaded yet
          </p>
          <p className="text-[10px] text-gray-400 mt-1 max-w-[250px] mx-auto leading-relaxed">
            {isAdmin
              ? 'Click "Add Document" above to upload your first certificate or file.'
              : "Documents for this service will appear here once uploaded."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-gray-50/40 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* File type icon */}
                <span className="text-xl p-2 bg-gray-50 rounded-lg group-hover:bg-white transition-colors border border-gray-100 flex-shrink-0">
                  {fileIcons[doc.file_type] || "📎"}
                </span>

                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold text-gray-900 truncate hover:text-blue-600 transition-colors"
                    title={doc.file_name}
                  >
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {doc.file_name}
                    </a>
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-gray-400 uppercase">
                      {doc.file_type}
                    </span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span>
                      {doc.file_size_kb ? `${doc.file_size_kb} KB` : "— KB"}
                    </span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span>
                      {new Date(doc.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {doc.uploader && (
                      <>
                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span className="text-blue-600 font-medium text-[11px]">
                          Uploaded by {doc.uploader.name}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Visibility Badge */}
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all select-none
                    ${
                      doc.visible_to_client
                        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                        : "bg-gray-50 border-gray-100 text-gray-400"
                    }`}
                >
                  {doc.visible_to_client
                    ? "Visible to client"
                    : "Internal Only"}
                </span>

                {/* Actions Row */}
                <div className="flex items-center gap-1.5 border-l border-gray-100 pl-3">
                  {/* Download */}
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-all"
                    title="Download / View"
                  >
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
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </a>

                  {/* Send via WhatsApp */}
                  <a
                    href={`https://wa.me/${waNum}?text=${encodeURIComponent(
                      `Hello ${clientName},\n\nHere is your document: *${doc.file_name}*\n\nYou can view and download it here: ${doc.file_url}\n\nRegards,\nPTC Portal`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-green-500 hover:bg-green-50 p-1.5 rounded-lg transition-all"
                    title="Send via WhatsApp"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </a>

                  {isAdmin && (
                    <>
                      {/* Toggle Client Visibility */}
                      <button
                        onClick={() => onToggleVisibility(doc.id)}
                        className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-all"
                        title={
                          doc.visible_to_client
                            ? "Hide from client portal"
                            : "Show in client portal"
                        }
                      >
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
                            d={
                              doc.visible_to_client
                                ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            }
                          />
                        </svg>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => {
                          if (
                            window.confirm("Delete this document permanently?")
                          ) {
                            onDelete(doc.id);
                          }
                        }}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                        title="Delete permanently"
                      >
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── TASKS TAB ─────────────────────────────────────────────────────────────────

function TasksTab({ client, isAdmin, onRefresh }) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [error, setError] = useState("");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => getEmployees(),
    enabled: isAdmin,
  });

  const mutation = useMutation({
    mutationFn: () =>
      createTask({
        client_id: client.id,
        title,
        due_date: dueDate || null,
        assigned_to: assignedTo ? parseInt(assignedTo) : null,
      }),
    onSuccess: () => {
      setTitle("");
      setDueDate("");
      setAssignedTo("");
      setShowForm(false);
      onRefresh();
    },
    onError: (err) => setError(err.response?.data?.detail || "Failed"),
  });

  const qc = useQueryClient();
  const updateTaskStatus = useMutation({
    mutationFn: ({ taskId, status }) =>
      import("../../api").then(({ updateTask }) =>
        updateTask(taskId, { status }),
      ),
    onSuccess: onRefresh,
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => deleteTask(taskId),
    onSuccess: onRefresh,
    onError: (err) =>
      alert(err.response?.data?.detail || "Failed to delete task"),
  });

  return (
    <div>
      {isAdmin && (
        <div className="mb-4">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              + Add Task
            </button>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              {error && <p className="text-xs text-red-600">{error}</p>}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">
                    Assign to Employee
                  </label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => mutation.mutate()}
                  disabled={!title || mutation.isPending}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg
                             hover:bg-blue-700 disabled:opacity-50"
                >
                  {mutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {client.tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-10 text-center">
          <p className="text-sm text-gray-500">No tasks for this client yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                  Status / Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {client.tasks.map((task) => (
                <tr
                  key={task.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          task.status !== "done" &&
                          updateTaskStatus.mutate({
                            taskId: task.id,
                            status: "done",
                          })
                        }
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          task.status === "done"
                            ? "bg-green-500 border-green-500"
                            : "border-gray-300 hover:border-blue-500"
                        }`}
                      >
                        {task.status === "done" && (
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                      <span
                        className={`text-sm font-medium ${
                          task.status === "done"
                            ? "text-gray-400 line-through"
                            : "text-gray-900"
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {task.assignee?.name || (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {task.due_date ? (
                      new Date(task.due_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    ) : (
                      <span className="text-gray-400">No due date</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Badge status={task.status} />
                      {isAdmin && (
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `Are you sure you want to delete the task "${task.title}"?`,
                              )
                            ) {
                              deleteTaskMutation.mutate(task.id);
                            }
                          }}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded hover:bg-gray-100"
                          title="Delete task"
                        >
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
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
  );
}
function EditClientModal({ client, onClose, onSuccess }) {
  const [activeSection, setActiveSection] = useState("basic");
  const [error, setError] = useState("");
  const [showPasswords, setShowPasswords] = useState({});

  const qc = useQueryClient();

  const [form, setForm] = useState({
    business_name: client.business_name || "",
    contact_person: client.contact_person || "",
    contact_name: client.contact_name || "",
    mobile: client.mobile || "",
    email: client.email || "",
    address: client.address || "",
    aadhaar_number: client.aadhaar_number || "",
    gstin: client.gstin || "",
    gst_username: client.gst_username || "",
    gst_password: client.gst_password || "",
    eway_bill_id: client.eway_bill_id || "",
    eway_password: client.eway_password || "",
    einvoice_id: client.einvoice_id || "",
    einvoice_password: client.einvoice_password || "",
    gstin_status: client.gstin_status || "",
    registration_date: client.registration_date || "",
    constitution: client.constitution || "",
    taxpayer_type: client.taxpayer_type || "",
    principal_place: client.principal_place || "",
    business_activity: client.business_activity || "",
    filing_type: client.filing_type || "",
    pan: client.pan || "",
    tan: client.tan || "",
    it_login_id: client.it_login_id || "",
    it_password: client.it_password || "",
    tds_login_id: client.tds_login_id || "",
    tds_password: client.tds_password || "",
    traces_id: client.traces_id || "",
    traces_password: client.traces_password || "",
    iec_code: client.iec_code || "",
    iec_password: client.iec_password || "",
    lut_number: client.lut_number || "",
    udyam_number: client.udyam_number || "",
    udyam_id: client.udyam_id || "",
    udyam_password: client.udyam_password || "",
    gumasta: client.gumasta || "",
    gumasta_id: client.gumasta_id || "",
    gumasta_password: client.gumasta_password || "",
    food_license: client.food_license || "",
    food_license_id: client.food_license_id || "",
    food_license_password: client.food_license_password || "",
    trademark: client.trademark || "",
    trademark_id: client.trademark_id || "",
    trademark_password: client.trademark_password || "",
    roc_id: client.roc_id || "",
    roc_password: client.roc_password || "",
    ptrc_number: client.ptrc_number || "",
    ptrc_id: client.ptrc_id || "",
    ptrc_password: client.ptrc_password || "",
    ptec_number: client.ptec_number || "",
    directors: client.directors || [],
    // GST Filing Return Statuses
    gstr1_iff_status: client.gstr1_iff_status || "",
    gstr3b_status: client.gstr3b_status || "",
    gstr4_status: client.gstr4_status || "",
    cmp08_status: client.cmp08_status || "",
    gstr4_annual_status: client.gstr4_annual_status || "",
    gstr9_annual_status: client.gstr9_annual_status || "",
    gstr9c_status: client.gstr9c_status || "",
    gstr1a_status: client.gstr1a_status || "",
    // Previous Year GST Filing Return Statuses
    gstr1_iff_status_prev: client.gstr1_iff_status_prev || "",
    gstr3b_status_prev: client.gstr3b_status_prev || "",
    gstr4_status_prev: client.gstr4_status_prev || "",
    cmp08_status_prev: client.cmp08_status_prev || "",
    gstr4_annual_status_prev: client.gstr4_annual_status_prev || "",
    gstr9_annual_status_prev: client.gstr9_annual_status_prev || "",
    gstr9c_status_prev: client.gstr9c_status_prev || "",
    gstr1a_status_prev: client.gstr1a_status_prev || "",
  });

  const [selectedYear, setSelectedYear] = useState("current");

  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaImage, setCaptchaImage] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [captchaText, setCaptchaText] = useState("");

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
      const result = await verifyGstCaptcha(sessionId, captchaText, client.id);
      if (result.success && result.data) {
        const d = result.data;
        setForm((p) => ({
          ...p,
          business_name: d.trade_name || d.legal_name || p.business_name,
          contact_person: d.legal_name || p.contact_person,
          contact_name: d.legal_name || p.contact_name,
          address: d.principal_place || p.address,
          gstin_status: d.status || "",
          constitution: d.constitution || "",
          registration_date: d.registration_date || "",
          taxpayer_type: d.taxpayer_type || "",
          filing_type: d.filing_type || "",
          principal_place: d.principal_place || "",
          business_activity: d.business_activity || "",
        }));

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
        setShowCaptcha(false);
        setCaptchaImage(null);
        setCaptchaText("");
        setSessionId(null);
      } else {
        setFetchError("Wrong CAPTCHA — try fetching again");
      }
    } catch (err) {
      setFetchError("Wrong CAPTCHA — try fetching again");
    } finally {
      setFetching(false);
    }
  };

  const mutation = useMutation({
    mutationFn: () => updateClient(client.id, form),
    onSuccess,
    onError: (err) =>
      setError(err.response?.data?.detail || "Failed to update client"),
  });

  const set = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));
  const togglePass = (field) =>
    setShowPasswords((p) => ({ ...p, [field]: !p[field] }));

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
            Edit — {client.business_name}
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

        <div className="flex border-b border-gray-100 px-6 flex-shrink-0 overflow-x-auto">
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
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitCaptcha();
                          }}
                        />
                        <button
                          onClick={submitCaptcha}
                          disabled={fetching || !captchaText}
                          className="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          Verify CAPTCHA
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
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add Director / Partner
                  </button>
                </div>

                {form.directors.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 border border-gray-100 rounded-xl">
                    <p className="text-xs text-gray-500 mb-2">
                      No directors/partners added yet.
                    </p>
                    <p className="text-xs text-gray-400">
                      Click the "Add Director / Partner" button to add one.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {form.directors.map((director, index) => (
                      <div
                        key={index}
                        className="relative p-4 border border-gray-200 rounded-xl bg-gray-50"
                      >
                        <button
                          onClick={() =>
                            setForm((p) => ({
                              ...p,
                              directors: p.directors.filter(
                                (_, i) => i !== index,
                              ),
                            }))
                          }
                          className="absolute top-3 right-3 text-red-500 hover:text-red-700 bg-white rounded-full p-1 shadow-sm transition-colors"
                          title="Remove"
                        >
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                        <h4 className="text-xs font-semibold text-gray-700 mb-3">
                          Member #{index + 1}
                        </h4>
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
                  <label className="text-xs font-semibold text-gray-500">
                    Financial Year:
                  </label>
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
                <FilingStatusBox
                  returnType="GSTR1 / IFF"
                  status={
                    selectedYear === "previous"
                      ? form.gstr1_iff_status_prev
                      : form.gstr1_iff_status
                  }
                />
                <FilingStatusBox
                  returnType="GSTR3B"
                  status={
                    selectedYear === "previous"
                      ? form.gstr3b_status_prev
                      : form.gstr3b_status
                  }
                />
                <FilingStatusBox
                  returnType="GSTR4"
                  status={
                    selectedYear === "previous"
                      ? form.gstr4_status_prev
                      : form.gstr4_status
                  }
                />
                <FilingStatusBox
                  returnType="CMP-08"
                  status={
                    selectedYear === "previous"
                      ? form.cmp08_status_prev
                      : form.cmp08_status
                  }
                />
                <FilingStatusBox
                  returnType="GSTR4 (Annual)"
                  status={
                    selectedYear === "previous"
                      ? form.gstr4_annual_status_prev
                      : form.gstr4_annual_status
                  }
                />
                <FilingStatusBox
                  returnType="GSTR9 (Annual)"
                  status={
                    selectedYear === "previous"
                      ? form.gstr9_annual_status_prev
                      : form.gstr9_annual_status
                  }
                />
                <FilingStatusBox
                  returnType="GSTR9C"
                  status={
                    selectedYear === "previous"
                      ? form.gstr9c_status_prev
                      : form.gstr9c_status
                  }
                />
                <FilingStatusBox
                  returnType="GSTR1A"
                  status={
                    selectedYear === "previous"
                      ? form.gstr1a_status_prev
                      : form.gstr1a_status
                  }
                />
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

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <div className="flex gap-2">
            {sections.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  activeSection === s.key ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-3">
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
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// ── HELPER ────────────────────────────────────────────────────────────────────

function InfoCard({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

function CredentialField({ label, value, placeholder, isPassword }) {
  const [show, setShow] = useState(!isPassword);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm flex flex-col justify-between min-h-[90px]">
      <div>
        <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mb-1">
          {label}
        </p>
        {value ? (
          <p className="text-sm font-semibold text-gray-900 font-mono break-all pr-8">
            {show ? value : "••••••••••••"}
          </p>
        ) : (
          <p className="text-sm italic text-gray-300 font-medium">
            {placeholder}
          </p>
        )}
      </div>

      {value && (
        <div className="flex items-center gap-1.5 self-end mt-2 pt-2 border-t border-gray-50 w-full justify-end">
          {isPassword && (
            <button
              onClick={() => setShow(!show)}
              className="p-1 hover:bg-gray-50 rounded text-gray-400 hover:text-gray-600 transition-colors"
              title={show ? "Hide Password" : "Show Password"}
            >
              {show ? (
                <svg
                  className="w-3.5 h-3.5"
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
                  className="w-3.5 h-3.5"
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
          )}
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-gray-50 rounded text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1 text-[10px] font-semibold"
            title="Copy to clipboard"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
              />
            </svg>
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function FilingStatusBox({ returnType, status }) {
  const s = (status || "").toLowerCase();
  let borderColor, bgColor, textColor, emoji, label;

  if (s === "filed") {
    borderColor = "border-emerald-300";
    bgColor = "bg-emerald-50/60";
    textColor = "text-emerald-700";
    emoji = "✅";
    label = "Filed";
  } else if (s === "pending") {
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
      <p className="text-xs font-bold text-gray-800 mb-1.5">{returnType}</p>
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold ${textColor} px-2 py-0.5 rounded-full`}
      >
        <span>{emoji}</span>
        {label}
      </span>
    </div>
  );
}
function WorkflowsTab({ workflows, isAdmin, onAssign }) {
  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <button
            onClick={onAssign}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            + Assign Workflow
          </button>
        </div>
      )}

      {workflows.map((wf) => (
        <div key={wf.workflow_id} className="bg-white border rounded-xl p-5">
          <h3 className="font-semibold">{wf.workflow_name}</h3>

          <p className="text-sm text-gray-500">
            Progress: {wf.progress_percent}%
          </p>
        </div>
      ))}
    </div>
  );
}

function AssignWorkflowModal({ clientId, templates, onClose, onSuccess }) {
  const [templateId, setTemplateId] = useState("");

  const [managerId, setManagerId] = useState("");

  const [employeeId, setEmployeeId] = useState("");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  const mutation = useMutation({
    mutationFn: () =>
      assignWorkflowToClient(clientId, templateId, managerId, employeeId),

    onSuccess,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-[500px]">
        <h2 className="text-lg font-bold mb-4">Assign Workflow</h2>

        <div className="space-y-3">
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="">Select Workflow</option>

            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="">Select Manager</option>

            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="">Select Employee</option>

            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2">
            Cancel
          </button>

          <button
            onClick={() => mutation.mutate()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}
