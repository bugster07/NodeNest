
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { BookOpen, LoaderCircle, LockKeyhole } from "lucide-react";
import api from "../services/api";

export default function SharedNote() {
  const { token } = useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/share/${token}`)
      .then(({ data }) => setNote(data.note))
      .catch((err) => setError(err.response?.data?.message || "This share link is invalid or has been revoked."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="min-h-screen grid place-items-center text-violet-700"><LoaderCircle className="animate-spin" /></div>;

  return (
    <main className="min-h-screen bg-[#f7f7fc] p-5 sm:p-10">
      <div className="max-w-3xl mx-auto">
        <Link to="/login" className="inline-flex items-center gap-2 text-violet-700 font-bold mb-8"><BookOpen /> NoteNest</Link>
        {error ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <LockKeyhole size={36} className="mx-auto text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold">Note unavailable</h1>
            <p className="text-gray-500 mt-2">{error}</p>
          </div>
        ) : note && (
          <article className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-10">
            <div className="flex items-center gap-2 text-sm text-violet-700 font-semibold"><LockKeyhole size={16} /> Public read-only note</div>
            <h1 className="text-3xl sm:text-4xl font-bold mt-4">{note.title}</h1>
            <div className="flex flex-wrap gap-2 mt-4">{(note.tags || []).map((tag) => <span key={tag} className="rounded-full bg-violet-50 text-violet-700 text-xs px-3 py-1">{tag}</span>)}</div>
            <div className="prose max-w-none mt-8"><ReactMarkdown>{note.content || ""}</ReactMarkdown></div>
            {note.summary && <section className="mt-8 border-t pt-6"><h2 className="font-bold text-xl mb-3">AI Summary</h2><ReactMarkdown>{note.summary}</ReactMarkdown></section>}
            {!!note.keyPoints?.length && <section className="mt-6"><h2 className="font-bold text-xl mb-3">Key Points</h2><ul className="list-disc pl-5 space-y-2">{note.keyPoints.map((point, i) => <li key={i}>{point}</li>)}</ul></section>}
          </article>
        )}
        <p className="text-center text-sm text-gray-400 mt-8">Shared securely with NoteNest</p>
      </div>
    </main>
  );
}
