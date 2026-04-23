"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useToast } from "./shared";

export default function ClassesPanel() {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [samples, setSamples] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const sampleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadClasses(); }, []);

  const loadClasses = async () => {
    try {
      const res = await fetch("/api/classes");
      const data = await res.json();
      setClasses(data.classes || []);
    } catch { showToast("Failed to load classes", "error"); }
  };

  const loadSamples = async (id: number) => {
    try {
      const res = await fetch(`/api/classes/${id}/samples`);
      const data = await res.json();
      setSamples(data.samples || []);
    } catch { showToast("Failed to load samples", "error"); }
  };

  const createClass = async (name: string, category: string, desc: string) => {
    const fd = new FormData();
    fd.append("name", name); fd.append("category", category); fd.append("description", desc);
    try {
      await fetch("/api/classes", { method: "POST", body: fd });
      showToast(`Class "${name}" created!`, "success");
      setShowModal(false);
      loadClasses();
    } catch { showToast("Failed to create class", "error"); }
  };

  const deleteClass = async (id: number) => {
    if (!confirm("Delete this class and all its samples?")) return;
    try {
      await fetch(`/api/classes/${id}`, { method: "DELETE" });
      showToast("Class deleted", "info");
      setSelectedClass(null);
      loadClasses();
    } catch { showToast("Failed to delete", "error"); }
  };

  const uploadSamples = async (files: FileList) => {
    if (!selectedClass) return;
    const fd = new FormData();
    for (let i = 0; i < files.length; i++) fd.append("files", files[i]);
    try {
      await fetch(`/api/classes/${selectedClass.id}/samples`, { method: "POST", body: fd });
      showToast(`Uploaded ${files.length} sample(s)!`, "success");
      loadSamples(selectedClass.id);
      loadClasses();
    } catch { showToast("Upload failed", "error"); }
  };

  const deleteSample = async (sid: number) => {
    try {
      await fetch(`/api/classes/samples/${sid}`, { method: "DELETE" });
      showToast("Sample deleted", "info");
      if (selectedClass) loadSamples(selectedClass.id);
      loadClasses();
    } catch { showToast("Failed to delete", "error"); }
  };

  const categories = [...new Set(classes.map((c) => c.category))];
  const filtered = classes
    .filter((c) => filter === "all" || c.category === filter)
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1200px] mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">📂 Sound Classes</h1>
        <p className="text-apple-gray text-lg">Manage sound categories and audio sample datasets</p>
      </div>

      {!selectedClass ? (
        <>
          <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search classes..." className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-apple-white placeholder:text-apple-gray focus:outline-none focus:border-accent-blue/40 w-60" />
            <button onClick={() => setShowModal(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white text-sm font-semibold">➕ Create Class</button>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => setFilter("all")} className={`px-3 py-1 rounded-lg text-xs font-medium ${filter === "all" ? "bg-white/10 text-white" : "text-apple-gray hover:text-white"}`}>All ({classes.length})</button>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setFilter(cat)} className={`px-3 py-1 rounded-lg text-xs font-medium ${filter === cat ? "bg-white/10 text-white" : "text-apple-gray hover:text-white"}`}>{cat} ({classes.filter((c) => c.category === cat).length})</button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map((c) => (
              <div key={c.id} onClick={() => { setSelectedClass(c); loadSamples(c.id); }} className="glass-card p-5 cursor-pointer hover:border-accent-blue/30 text-center">
                <div className="text-2xl mb-2">{c.icon || "🔊"}</div>
                <div className="text-sm font-semibold text-apple-white">{c.name}</div>
                <div className="text-xs text-apple-gray">{c.category}</div>
                <div className="text-xs text-apple-gray mt-1">Samples: {c.sample_count}</div>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-apple-gray">No classes found. Create one to get started.</div>
          )}
        </>
      ) : (
        <div>
          <button onClick={() => setSelectedClass(null)} className="text-sm text-apple-gray hover:text-white mb-6 inline-block">← Back to Classes</button>
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-3xl">{selectedClass.icon || "🔊"}</span>
                <div>
                  <h2 className="text-xl font-bold">{selectedClass.name}</h2>
                  <span className="text-sm text-apple-gray">{selectedClass.category}</span>
                </div>
              </div>
              <button onClick={() => deleteClass(selectedClass.id)} className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">🗑️ Delete</button>
            </div>
          </div>
          <div onClick={() => sampleRef.current?.click()} className="glass-card p-8 text-center cursor-pointer hover:border-accent-blue/30 mb-6">
            <input ref={sampleRef} type="file" accept="audio/*" multiple className="hidden" onChange={(e) => e.target.files && uploadSamples(e.target.files)} />
            <div className="text-2xl mb-2">📤</div>
            <div className="text-sm font-semibold">Drop audio samples or click to upload</div>
            <div className="text-xs text-apple-gray">Upload multiple files to build your training dataset</div>
          </div>
          <h3 className="text-sm font-semibold text-apple-gray mb-3">Audio Samples ({samples.length})</h3>
          <div className="space-y-2">
            {samples.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span>🎵</span>
                <span className="text-sm flex-1 truncate">{s.original_name || s.filename}</span>
                <span className="text-xs text-apple-gray">{s.duration}s</span>
                <button onClick={() => deleteSample(s.id)} className="text-xs text-apple-gray hover:text-red-400">✕</button>
              </div>
            ))}
            {samples.length === 0 && <div className="text-center py-8 text-apple-gray text-sm">No samples yet. Upload audio files.</div>}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && <CreateClassModal onClose={() => setShowModal(false)} onCreate={createClass} />}
    </motion.div>
  );
}

function CreateClassModal({ onClose, onCreate }: { onClose: () => void; onCreate: (n: string, c: string, d: string) => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Custom");
  const [desc, setDesc] = useState("");
  const cats = ["Birds", "Vehicles", "Weather", "Music", "Human", "Nature", "Urban", "Custom"];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-6">➕ Create New Sound Class</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-apple-gray block mb-1">Class Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Dog Bark" className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-accent-blue/40" />
          </div>
          <div>
            <label className="text-xs font-medium text-apple-gray block mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none">
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-apple-gray block mb-1">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional..." className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none h-20 resize-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-white/10 text-sm text-apple-gray hover:text-white">Cancel</button>
            <button onClick={() => name && onCreate(name, category, desc)} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white text-sm font-semibold">Create</button>
          </div>
        </div>
      </div>
    </div>
  );
}
