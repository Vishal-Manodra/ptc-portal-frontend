import { useState } from "react";

import { getGstCaptcha, verifyGstCaptcha } from "../../api";

export default function GSTLookup() {
  const [gstin, setGstin] = useState("");

  const [captchaImage, setCaptchaImage] = useState("");

  const [captchaText, setCaptchaText] = useState("");

  const [sessionId, setSessionId] = useState("");

  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(false);

  async function fetchCaptcha() {
    try {
      setLoading(true);

      const result = await getGstCaptcha(gstin);

      console.log(result);

      setSessionId(result.session_id);

      setCaptchaImage(result.captcha_image);
    } catch (e) {
      console.log(e);

      alert("Failed loading captcha");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    try {
      setLoading(true);

      console.log("SENDING CLIENT ID:", client.id);

      const result = await verifyGstCaptcha(sessionId, captchaText, client.id);

      console.log(result);

      if (result.success) {
        setData(result.data);
      }
    } catch (e) {
      console.log(e);

      alert("Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="
max-w-3xl
mx-auto
p-6
space-y-4"
    >
      <h1
        className="
text-2xl
font-bold"
      >
        GST Lookup
      </h1>

      <input
        className="
border
w-full
p-3
rounded"
        placeholder="Enter GSTIN"
        value={gstin}
        onChange={(e) => setGstin(e.target.value)}
      />

      <button
        className="
bg-blue-600
text-white
px-4
py-2
rounded"
        onClick={fetchCaptcha}
      >
        {loading ? "Loading..." : "Fetch Captcha"}
      </button>

      {captchaImage && (
        <>
          <img
            src={captchaImage}
            alt="captcha"
            className="
border
p-2
mt-4"
          />

          <input
            className="
border
w-full
p-3
rounded"
            placeholder="Enter captcha"
            value={captchaText}
            onChange={(e) => setCaptchaText(e.target.value)}
          />

          <button
            className="
bg-green-600
text-white
px-4
py-2
rounded"
            onClick={verify}
          >
            Verify GST
          </button>
        </>
      )}

      {data && (
        <div
          className="
border
rounded
p-5
space-y-2"
        >
          <h2
            className="
font-bold
text-xl"
          >
            GST Details
          </h2>

          <p>
            <b>Legal:</b> {data.legal_name}
          </p>

          <p>
            <b>Trade:</b> {data.trade_name}
          </p>

          <p>
            <b>Status:</b> {data.status}
          </p>

          <p>
            <b>Taxpayer:</b> {data.taxpayer_type}
          </p>

          <p>
            <b>Business:</b> {data.core_business_activity}
          </p>

          <p>
            <b>Filing:</b> {data.filing_type}
          </p>

          <p>
            <b>Address:</b> {data.principal_place}
          </p>
        </div>
      )}
    </div>
  );
}
