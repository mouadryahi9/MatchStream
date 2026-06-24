import { useState, useRef } from "react";
import api from "../services/api/client";
import { FiUpload, FiCheckCircle, FiAlertCircle, FiFile } from "react-icons/fi";

export default function UploadPage() {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    // Try admin endpoint first, fall back to iptv endpoint
    try {
      const { data } = await api.post("/admin/iptv/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-white mb-6">Upload M3U</h1>

      <form onSubmit={handleUpload} className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-6 max-w-lg">
        <div className="border-2 border-dashed border-gray-800 rounded-xl p-8 text-center mb-4 hover:border-red-600/50 transition-colors">
          <FiFile size={32} className="mx-auto mb-3 text-gray-600" />
          <p className="text-sm text-gray-400 mb-2">Drop an M3U file or click to browse</p>
          <input ref={fileRef} type="file" accept=".m3u,.m3u8,text/plain" className="text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-red-600 file:text-white hover:file:bg-red-700 cursor-pointer" />
        </div>

        <button type="submit" disabled={uploading} className="btn-primary w-full flex items-center justify-center gap-2">
          {uploading ? (
            <>Uploading...</>
          ) : (
            <><FiUpload size={14} /> Upload M3U</>
          )}
        </button>
      </form>

      {result && (
        <div className="bg-green-900/20 border border-green-800 rounded-xl p-4 mt-4 max-w-lg flex items-start gap-3">
          <FiCheckCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-400">Import complete</p>
            <p className="text-xs text-green-600 mt-1">{result.message}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mt-4 max-w-lg flex items-start gap-3">
          <FiAlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">Upload failed</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
