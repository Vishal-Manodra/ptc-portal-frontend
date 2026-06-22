import api from "./axios";

export const getDocumentRegisterEntries = async (clientId) => {
  const res = await api.get(`/document-register/client/${clientId}`);
  return res.data;
};

export const registerDocumentIn = async (data) => {
  const res = await api.post("/document-register/", data);
  return res.data;
};

export const registerDocumentOut = async (entryId, data) => {
  const res = await api.patch(`/document-register/${entryId}/return`, data);
  return res.data;
};
