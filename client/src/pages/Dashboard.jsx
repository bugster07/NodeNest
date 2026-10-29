
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Plus,
  Search,
  Sparkles,
  FileText,
  Clock3,
  Trash2,
  LogOut,
  Tag,
  X,
  LoaderCircle,
  Upload,
} from "lucide-react";
import api from "../services/api";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function Dashboard() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    content: "",
    tags: "",
  });

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/notes", {
        params: {
          search: search || undefined,
          page: 1,
          limit: 50,
        },
      });

      const list = Array.isArray(data.notes)
        ? data.notes
        : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];

      setNotes(list);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("accessToken");
        navigate("/login");
        return;
      }

      setError(
        err.response?.data?.message ||
          "Could not load your notes."
      );
    } finally {
      setLoading(false);
    }
  }, [search, navigate]);

  useEffect(() => {
    const timer = setTimeout(loadNotes, 250);
    return () => clearTimeout(timer);
  }, [loadNotes]);

  const createNote = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/notes", {
        title: form.title.trim(),
        content: form.content.trim(),
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });

      setForm({ title: "", content: "", tags: "" });
      setShowModal(false);
      setSuccess("Note created successfully!");
      await loadNotes();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not create the note."
      );
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (e) => {
    const file = e.target.files?.[0];

    // Allow selecting the same file again after an attempt.
    e.target.value = "";

    if (!file) return;

    setError("");
    setSuccess("");

    const extensionIsValid = /\.(pdf|txt)$/i.test(file.name);

    if (!extensionIsValid) {
      setError("Only PDF and TXT files are allowed.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File size must be 5 MB or less.");
      return;
    }

    if (file.size === 0) {
      setError("The selected file is empty.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);

    try {
      // Assumes the backend endpoint is POST /api/notes/upload
      // and Multer expects the field name "file".
      const { data } = await api.post(
        "/notes/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setSuccess(
        data.message || "File uploaded successfully!"
      );

      await loadNotes();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.response?.status === 404
            ? "Upload endpoint not found. Check the backend route."
            : "File upload failed. Please try again.")
      );
    } finally {
      setUploading(false);
    }
  };

  const deleteNote = async (id) => {
    if (!window.confirm("Delete this note permanently?")) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await api.delete(`/notes/${id}`);

      setNotes((current) =>
        current.filter((note) => note._id !== id)
      );

      setSuccess("Note deleted successfully!");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not delete the note."
      );
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Clear the local session even if logout request fails.
    } finally {
      localStorage.removeItem("accessToken");
      navigate("/login");
    }
  };

  const openNote = (note) => {
    navigate(`/notes/${note._id}`);
  };

  const totalTags = new Set(
    notes.flatMap((note) => note.tags || [])
  ).size;

  return (
    <div className="min-h-screen bg-[#f7f7fc] md:flex">
      {/* Sidebar */}
      <aside className="flex flex-col bg-[#201b3c] p-6 text-white md:fixed md:inset-y-0 md:left-0 md:w-64">
        <div className="flex items-center gap-3 text-xl font-bold">
          <div className="rounded-xl bg-violet-500 p-2">
            <BookOpen size={21} />
          </div>
          NoteNest
        </div>

        <div className="mt-12">
          <p className="mb-4 text-xs uppercase tracking-[0.2em] text-violet-300">
            Workspace
          </p>

          <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
            <FileText size={18} />
            All Notes
            <span className="ml-auto text-sm text-violet-200">
              {notes.length}
            </span>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
          <Sparkles className="mb-3 text-violet-300" />
          <p className="font-semibold">Your AI study buddy</p>
          <p className="mt-2 text-sm leading-6 text-violet-200">
            Summarize notes and turn what you learn into
            flashcards.
          </p>
        </div>

        <div className="mt-auto pt-8">
          <button
            onClick={logout}
            className="flex items-center gap-3 text-violet-200 hover:text-white"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10 md:ml-64">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-violet-700">
              YOUR LEARNING SPACE
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              My Notes
            </h1>
            <p className="mt-2 text-gray-500">
              Keep your ideas organized. Learn a little more
              every day.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              className="hidden"
              onChange={uploadFile}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-3 font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? (
                <LoaderCircle
                  size={19}
                  className="animate-spin"
                />
              ) : (
                <Upload size={19} />
              )}
              {uploading ? "Uploading..." : "Upload PDF/TXT"}
            </button>

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white shadow-sm hover:bg-violet-800"
            >
              <Plus size={19} />
              New note
            </button>
          </div>
        </header>

        {/* Notifications */}
        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start justify-between gap-3 rounded-xl bg-red-50 p-4 text-red-700"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mt-5 flex items-start justify-between gap-3 rounded-xl bg-green-50 p-4 text-green-700"
          >
            <p>{success}</p>
            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss message"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Statistics */}
        <section className="mt-9 grid gap-4 sm:grid-cols-3">
          <Stat
            icon={<FileText />}
            label="Total notes"
            value={notes.length}
          />
          <Stat
            icon={<Tag />}
            label="Unique tags"
            value={totalTags}
          />
          <Stat
            icon={<Sparkles />}
            label="AI study tools"
            value="Ready"
          />
        </section>

        {/* Search */}
        <div className="mt-9 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-xl font-bold">Your collection</h2>

          <div className="relative w-full sm:max-w-sm">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your notes..."
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 outline-none focus:ring-2 focus:ring-violet-200"
            />
          </div>
        </div>

        {/* Notes collection */}
        {loading ? (
          <div className="flex justify-center py-20 text-violet-700">
            <LoaderCircle className="animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-violet-200 bg-white p-10 text-center sm:p-16">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <BookOpen size={30} />
            </div>

            <h3 className="text-xl font-bold">
              {search
                ? "No matching notes"
                : "Your notebook starts here"}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-gray-500">
              {search
                ? "Try another search term."
                : "Create a note or upload a PDF/TXT file to get started."}
            </p>

            {!search && (
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => setShowModal(true)}
                  className="rounded-xl bg-violet-700 px-5 py-3 font-semibold text-white"
                >
                  <Plus className="mr-2 inline" size={18} />
                  Create a note
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-xl border border-violet-200 px-5 py-3 font-semibold text-violet-700 disabled:opacity-60"
                >
                  <Upload className="mr-2 inline" size={18} />
                  Upload a file
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {notes.map((note) => (
              <article
                key={note._id}
                className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:border-violet-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => openNote(note)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                      <FileText size={20} />
                    </div>

                    <h3 className="break-words text-lg font-bold leading-6">
                      {note.title}
                    </h3>
                  </button>

                  <button
                    type="button"
                    title="Delete note"
                    aria-label={`Delete ${note.title}`}
                    onClick={() => deleteNote(note._id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <button
                  onClick={() => openNote(note)}
                  className="w-full text-left"
                >
                  <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-gray-500">
                    {note.summary ||
                      note.content ||
                      "No content yet."}
                  </p>
                </button>

                <div className="mt-5 flex flex-wrap gap-2">
                  {(note.tags || []).slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-violet-50 px-3 py-1 text-xs text-violet-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex items-center gap-2 border-t pt-4 text-xs text-gray-400">
                  <Clock3 size={14} />
                  Updated{" "}
                  {note.updatedAt
                    ? new Date(note.updatedAt).toLocaleDateString()
                    : "recently"}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Create note modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <form
            onSubmit={createNote}
            onClick={(e) => e.stopPropagation()}
            className="my-auto w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-violet-700">
                  NEW ENTRY
                </p>
                <h2 className="mt-1 text-2xl font-bold">
                  Create a note
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl p-2 hover:bg-gray-100"
                aria-label="Close modal"
              >
                <X />
              </button>
            </div>

            <label className="mb-2 block text-sm font-medium">
              Title
            </label>
            <input
              required
              maxLength={200}
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
              placeholder="e.g. Introduction to React"
              className="mb-5 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-violet-200"
            />

            <label className="mb-2 block text-sm font-medium">
              Content
            </label>
            <textarea
              required
              value={form.content}
              onChange={(e) =>
                setForm({ ...form, content: e.target.value })
              }
              placeholder="Write your study notes here..."
              rows={7}
              className="mb-5 w-full resize-y rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-violet-200"
            />

            <label className="mb-2 block text-sm font-medium">
              Tags{" "}
              <span className="text-gray-400">
                (comma-separated)
              </span>
            </label>
            <input
              value={form.tags}
              onChange={(e) =>
                setForm({ ...form, tags: e.target.value })
              }
              placeholder="React, JavaScript, Revision"
              className="mb-6 w-full rounded-xl border px-4 py-3 outline-none focus:ring-2 focus:ring-violet-200"
            />

            <button
              disabled={saving}
              className="w-full rounded-xl bg-violet-700 py-3 font-semibold text-white hover:bg-violet-800 disabled:opacity-60"
            >
              {saving ? "Saving note..." : "Save note"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}
