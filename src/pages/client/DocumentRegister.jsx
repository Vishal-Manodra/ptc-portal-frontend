import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getDocumentRegisterEntries,
  registerDocumentIn,
  registerDocumentOut,
} from "../../api/documentRegister";

const initialInForm = {
  document_name: "",
  document_details: "",
  collected_by: "",
  remarks: "",
};

const initialOutForm = {
  returned_to: "",
  returned_by: "",
  remarks: "",
};

export default function DocumentRegister({ clientId }) {
  const queryClient = useQueryClient();
  const [showInModal, setShowInModal] = useState(false);
  const [showOutModal, setShowOutModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [form, setForm] = useState(initialInForm);
  const [outForm, setOutForm] = useState(initialOutForm);
  const [error, setError] = useState("");

  const {
    data: entries = [],
    isLoading,
    error: loadError,
  } = useQuery({
    queryKey: ["document-register", clientId],
    queryFn: () => getDocumentRegisterEntries(clientId),
    enabled: Boolean(clientId),
  });

  const registerInMutation = useMutation({
    mutationFn: registerDocumentIn,
    onSuccess: () => {
      setShowInModal(false);
      setForm(initialInForm);
      queryClient.invalidateQueries({
        queryKey: ["document-register", clientId],
      });
    },
    onError: (err) => {
      setError(err.response?.data?.detail || "Could not register document in.");
    },
  });

  const registerOutMutation = useMutation({
    mutationFn: ({ entryId, data }) => registerDocumentOut(entryId, data),
    onSuccess: () => {
      setShowOutModal(false);
      setSelectedEntry(null);
      setOutForm(initialOutForm);
      queryClient.invalidateQueries({
        queryKey: ["document-register", clientId],
      });
    },
    onError: (err) => {
      setError(
        err.response?.data?.detail || "Could not register document out.",
      );
    },
  });

  const saving = registerInMutation.isPending || registerOutMutation.isPending;

  const updateForm = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const updateOutForm = (field) => (event) => {
    setOutForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleRegisterIn = (event) => {
    event.preventDefault();
    setError("");
    registerInMutation.mutate({
      client_id: clientId,
      ...form,
    });
  };

  const handleRegisterOut = (event) => {
    event.preventDefault();
    if (!selectedEntry) return;

    setError("");
    registerOutMutation.mutate({
      entryId: selectedEntry.id,
      data: outForm,
    });
  };

  const openOutModal = (entry) => {
    setSelectedEntry(entry);
    setOutForm(initialOutForm);
    setShowOutModal(true);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Document Register
          </h2>
          <p className="text-sm text-gray-500">
            Track physical documents collected from and returned to clients.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setForm(initialInForm);
            setShowInModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          Register In
        </button>
      </div>

      {(error || loadError) && (
        <div className="mx-5 mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error ||
            loadError?.response?.data?.detail ||
            "Could not load document register."}
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">
          No document register entries yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">Document</th>
                <th className="px-5 py-3">Collected By</th>
                <th className="px-5 py-3">Collected On</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900">
                      {entry.document_name}
                    </p>
                    {entry.document_details && (
                      <p className="text-xs text-gray-500 mt-1">
                        {entry.document_details}
                      </p>
                    )}
                    {entry.remarks && (
                      <p className="text-xs text-gray-400 mt-1">
                        Remarks: {entry.remarks}
                      </p>
                    )}
                  </td>

                  <td className="px-5 py-4 text-gray-700">
                    {entry.collected_by}
                  </td>

                  <td className="px-5 py-4 text-gray-600">
                    {new Date(entry.collected_at).toLocaleDateString("en-IN")}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        entry.returned_at
                          ? "bg-red-50 text-red-700"
                          : "bg-green-50 text-green-700"
                      }`}
                    >
                      {entry.returned_at ? "🔴 Returned" : "🟢 In Office"}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    {!entry.returned_at ? (
                      <button
                        type="button"
                        onClick={() => openOutModal(entry)}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Register Out
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">
                        Returned{" "}
                        {entry.returned_at &&
                          new Date(entry.returned_at).toLocaleDateString(
                            "en-IN",
                          )}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInModal && (
        <RegisterModal
          title="Register Document In"
          onClose={() => setShowInModal(false)}
          onSubmit={handleRegisterIn}
          saving={saving}
        >
          <Input
            label="Document Name"
            value={form.document_name}
            onChange={updateForm("document_name")}
            required
          />
          <Textarea
            label="Document Details"
            value={form.document_details}
            onChange={updateForm("document_details")}
          />
          <Input
            label="Collected By"
            value={form.collected_by}
            onChange={updateForm("collected_by")}
            required
          />
          <Textarea
            label="Remarks"
            value={form.remarks}
            onChange={updateForm("remarks")}
          />
        </RegisterModal>
      )}

      {showOutModal && selectedEntry && (
        <RegisterModal
          title={`Register Out: ${selectedEntry.document_name}`}
          onClose={() => setShowOutModal(false)}
          onSubmit={handleRegisterOut}
          saving={saving}
        >
          <Input
            label="Returned To"
            value={outForm.returned_to}
            onChange={updateOutForm("returned_to")}
            required
          />
          <Input
            label="Returned By"
            value={outForm.returned_by}
            onChange={updateOutForm("returned_by")}
            required
          />
          <Textarea
            label="Remarks"
            value={outForm.remarks}
            onChange={updateOutForm("remarks")}
          />
        </RegisterModal>
      )}
    </div>
  );
}

function RegisterModal({ title, children, onClose, onSubmit, saving }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            X
          </button>
        </div>

        {children}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </span>
      <input
        {...props}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}

function Textarea({ label, ...props }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </span>
      <textarea
        {...props}
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </label>
  );
}
