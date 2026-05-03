import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { resumeAPI } from './src/api.js';

const Upload = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (f) => {
    setError('');
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(f.type) && !f.name.match(/\.(pdf|doc|docx)$/i)) {
      setError('Only PDF, DOC, and DOCX files are allowed.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('File must be smaller than 5MB.');
      return;
    }
    setFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const { data } = await resumeAPI.upload(formData);
      navigate(`/rewrite/${data.resume.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold font-display text-white mb-2">Upload Your Resume</h1>
        <p className="text-slate-400 mb-8">Support PDF, DOC, DOCX · Max 5MB</p>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
            dragging
              ? 'border-brand-400 bg-brand-500/5'
              : file
                ? 'border-green-500/50 bg-green-500/5'
                : 'border-slate-700 hover:border-slate-500 bg-slate-900/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx"
            onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
          />
          <div className="text-5xl mb-4">{file ? '✅' : '📁'}</div>
          {file ? (
            <>
              <p className="text-white font-semibold">{file.name}</p>
              <p className="text-slate-400 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </>
          ) : (
            <>
              <p className="text-slate-300 font-medium">Drag & drop your resume here</p>
              <p className="text-slate-500 text-sm mt-1">or click to browse files</p>
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mt-4">
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          {file && (
            <button
              onClick={() => setFile(null)}
              className="px-6 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn-primary flex-1"
          >
            {uploading ? 'Uploading & Parsing...' : 'Upload & AI Rewrite →'}
          </button>
        </div>

        {uploading && (
          <div className="mt-6 text-center text-slate-400 text-sm">
            ⏳ Parsing your resume... this usually takes a few seconds.
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;
