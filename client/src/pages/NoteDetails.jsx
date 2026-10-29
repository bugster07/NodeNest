
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft, Save, Sparkles, Layers, Send, Share2,
  Copy, LoaderCircle, FileText
} from "lucide-react";
import api from "../services/api";

export default function NoteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [note, setNote] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", tags: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [cards, setCards] = useState([]);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [asking, setAsking] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/notes/${id}`);
        const item = data.note || data.data || data;

        setNote(item);
        setForm({
          title: item.title || "",
          content: item.content || "",
          tags: (item.tags || []).join(", "),
        });
        setCards(item.flashcards || []);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load this note.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const saveNote = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const { data } = await api.patch(`/notes/${id}`, {
        title: form.title,
        content: form.content,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      });

      const updated = data.note || data.data || data;
      setNote((current) => ({ ...current, ...updated }));
      setForm({
        title: updated.title || form.title,
        content: updated.content ?? form.content,
        tags: (updated.tags || form.tags.split(",").map((t) => t.trim()).filter(Boolean)).join(", "),
      });
    } catch (err) {
      setError(err.response?.data?.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  const generate = async (type) => {
    setBusy(type);
    setError("");

    try {
      const { data } = await api.post(`/notes/${id}/${type}`);

      if (type === "summarize") {
        const updated = data.note || data;
        setNote((current) => ({
          ...current,
          summary: updated.summary ?? data.summary ?? current.summary,
          keyPoints: updated.keyPoints ?? data.keyPoints ?? current.keyPoints,
        }));
      } else {
        setCards(data.flashcards || data.note?.flashcards || data.data?.flashcards || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || `Could not generate ${type}.`);
    } finally {
      setBusy("");
    }
  };

  const askQuestion = async (e) => {
    e.preventDefault();
    const text = question.trim();
    if (!text || asking) return;

    setQuestion("");
    setMessages((current) => [...current, { role: "user", text }]);
    setMessages((current) => [...current, { role: "assistant", text: "" }]);
    setAsking(true);
    setError("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/notes/${id}/ask`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: JSON.stringify({ question: text }),
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || "Could not get an answer.");
      }

      if (!response.body) throw new Error("Streaming is not supported by this response.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const line = event.split("\n").find((part) => part.startsWith("data: "));
          if (!line) continue;

          const payload = line.slice(6);
          if (payload === "[DONE]") continue;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) {
              setMessages((current) => {
                const copy = [...current];
                const last = copy.length - 1;
                if (copy[last]?.role === "assistant") {
                  copy[last] = { ...copy[last], text: copy[last].text + parsed.text };
                }
                return copy;
              });
            }
          } catch {
            // Ignore incomplete or non-JSON SSE messages.
          }
        }
      }
    } catch (err) {
      setError(err.message || "AI chat failed.");
      setMessages((current) => {
        const copy = [...current];
        if (copy.at(-1)?.role === "assistant" && !copy.at(-1).text) copy.pop();
        return copy;
      });
    } finally {
      setAsking(false);
    }
  };

  const createShare = async () => {
    try {
      setError("");
      const { data } = await api.post(`/share/${id}`);
      setShareUrl(data.shareUrl);
      await navigator.clipboard.writeText(data.shareUrl);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create share link.");
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-violet-700"><LoaderCircle className="animate-spin" /></div>;
  }

  if (!note) {
    return <main className="max-w-3xl mx-auto p-8"><p role="alert">{error || "Note not found."}</p><Link to="/" className="text-violet-700">Back to dashboard</Link></main>;
  }

  return (
    <main className="min-h-screen bg-[#f7f7fc] p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 text-gray-500 hover:text-violet-700 mb-6">
          <ArrowLeft size={18} /> Back to notes
        </button>

        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
          <div>
            <p className="text-sm text-violet-700 font-semibold">NOTE WORKSPACE</p>
            <h1 className="text-3xl font-bold mt-2">Edit your note</h1>
          </div>
          <button onClick={createShare} className="inline-flex items-center justify-center gap-2 border bg-white rounded-xl px-4 py-3 font-semibold hover:border-violet-300">
            <Share2 size={18} /> Create share link
          </button>
        </header>

        {error && <div role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>}

        {shareUrl && (
          <div className="mb-5 rounded-xl border border-violet-200 bg-violet-50 p-4">
            <p className="font-semibold text-violet-900">Your read-only share link</p>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <input readOnly value={shareUrl} className="min-w-0 flex-1 rounded-lg border bg-white p-3 text-sm" />
              <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-700 text-white px-4 py-2"><Copy size={16} /> Copy</button>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-6">
          <form onSubmit={saveNote} className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-7 shadow-sm">
            <div className="flex items-center gap-2 mb-6"><FileText className="text-violet-700" /><h2 className="font-bold text-xl">Note editor</h2></div>

            <label className="block font-medium text-sm mb-2">Title</label>
            <input required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border rounded-xl p-3 mb-5 outline-none focus:ring-2 focus:ring-violet-200" />

            <label className="block font-medium text-sm mb-2">Content (Markdown supported)</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={12} className="w-full border rounded-xl p-3 mb-5 outline-none focus:ring-2 focus:ring-violet-200 resize-y" />

            <label className="block font-medium text-sm mb-2">Tags</label>
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="React, Revision" className="w-full border rounded-xl p-3 mb-6 outline-none focus:ring-2 focus:ring-violet-200" />

            <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 hover:bg-violet-800 disabled:opacity-60 text-white px-5 py-3 font-semibold">
              <Save size={18} /> {saving ? "Saving..." : "Save changes"}
            </button>
          </form>

          <div className="space-y-6">
            <section className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4"><Sparkles className="text-violet-700" /><h2 className="text-xl font-bold">AI summary</h2></div>
              <button onClick={() => generate("summarize")} disabled={!!busy} className="w-full rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 font-semibold py-3 disabled:opacity-60">
                {busy === "summarize" ? "Generating summary..." : "Generate summary"}
              </button>
              {note.summary && <div className="prose prose-sm mt-5 max-w-none"><ReactMarkdown>{note.summary}</ReactMarkdown></div>}
              {!!note.keyPoints?.length && (
                <div className="mt-5">
                  <h3 className="font-semibold mb-2">Key points</h3>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">{note.keyPoints.map((point, i) => <li key={i}>{point}</li>)}</ul>
                </div>
              )}
            </section>

            <section className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4"><Layers className="text-violet-700" /><h2 className="text-xl font-bold">Flashcards</h2></div>
              <button onClick={() => generate("flashcards")} disabled={!!busy} className="w-full rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 font-semibold py-3 disabled:opacity-60">
                {busy === "flashcards" ? "Generating flashcards..." : "Generate flashcards"}
              </button>
              <div className="space-y-3 mt-4">
                {cards.map((card, index) => <details key={index} className="border rounded-xl p-4"><summary className="font-semibold cursor-pointer">{card.question}</summary><p className="text-sm text-gray-600 mt-3">{card.answer}</p></details>)}
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4"><Sparkles className="text-violet-700" /><h2 className="text-xl font-bold">Ask this note</h2></div>
              <div className="max-h-80 overflow-y-auto space-y-3 mb-4">
                {messages.length === 0 && <p className="text-sm text-gray-500">Ask a question grounded in this note.</p>}
                {messages.map((message, index) => <div key={index} className={`rounded-xl p-3 text-sm whitespace-pre-wrap ${message.role === "user" ? "bg-violet-50 ml-6" : "bg-gray-50 mr-4"}`}><p className="font-semibold mb-1">{message.role === "user" ? "You" : "NoteNest AI"}</p>{message.text || (asking ? "Thinking..." : "")}</div>)}
              </div>
              <form onSubmit={askQuestion} className="flex gap-2">
                <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={2000} placeholder="Ask something about this note..." className="min-w-0 flex-1 border rounded-xl px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-200" />
                <button disabled={asking || !question.trim()} className="bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white rounded-xl px-4"><Send size={18} /></button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
