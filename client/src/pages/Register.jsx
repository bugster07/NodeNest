
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";
import api from "../services/api";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/register", form);
      navigate("/login", {
        state: { message: "Account created! Please sign in." },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-violet-50 p-5">
      <form onSubmit={handleSubmit} className="bg-white p-8 sm:p-10 rounded-3xl shadow-sm w-full max-w-md">
        <div className="flex items-center gap-2 text-violet-700 font-bold text-xl mb-8">
          <BookOpen /> NoteNest
        </div>

        <h1 className="text-3xl font-bold">Create your account</h1>
        <p className="text-gray-500 mt-2 mb-7">Start building your personal knowledge space.</p>

        {error && <p role="alert" className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm">{error}</p>}

        {[
          { key: "name", label: "Full name", type: "text" },
          { key: "email", label: "Email address", type: "email" },
          { key: "password", label: "Password", type: "password" },
        ].map((field) => (
          <label key={field.key} className="block text-sm font-medium mb-4">
            {field.label}
            <input
              className="mt-2 w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-violet-300"
              type={field.type}
              autoComplete={field.key === "password" ? "new-password" : field.key}
              required
              minLength={field.key === "password" ? 8 : undefined}
              value={form[field.key]}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
            />
          </label>
        ))}

        <button disabled={loading} className="w-full bg-violet-700 hover:bg-violet-800 disabled:opacity-60 text-white rounded-xl py-3 font-semibold mt-2">
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-violet-700 font-semibold">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
