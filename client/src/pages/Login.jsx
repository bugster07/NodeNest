
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Mail, Lock } from "lucide-react";
import api from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", form);
      const token = data.accessToken || data.token;

      if (!token) {
        throw new Error("Login response did not contain an access token.");
      }

      localStorage.setItem("accessToken", token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid md:grid-cols-2 bg-white">
      <section className="hidden md:flex flex-col justify-between bg-violet-700 text-white p-12">
        <div className="flex items-center gap-3 text-xl font-bold">
          <BookOpen /> NoteNest
        </div>
        <div>
          <p className="text-violet-200 mb-4">YOUR SPACE TO LEARN</p>
          <h1 className="text-5xl font-bold leading-tight">
            Your notes.<br />Your knowledge.<br />Your growth.
          </h1>
          <p className="mt-5 text-violet-100">
            Turn study material into knowledge with your AI study companion.
          </p>
        </div>
        <p className="text-sm text-violet-200">Study smarter with NoteNest.</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <div className="flex items-center gap-2 text-violet-700 font-bold text-xl mb-10 md:hidden">
            <BookOpen /> NoteNest
          </div>

          <p className="text-violet-600 font-semibold text-sm">WELCOME BACK</p>
          <h2 className="text-3xl font-bold mt-2">Sign in to NoteNest</h2>
          <p className="text-gray-500 mt-2 mb-8">
            Pick up where your learning left off.
          </p>

          {error && (
            <p role="alert" className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 text-sm">
              {error}
            </p>
          )}

          <label className="block text-sm font-medium mb-2">Email address</label>
          <div className="flex items-center gap-3 border rounded-xl px-4 mb-5 focus-within:ring-2 focus-within:ring-violet-300">
            <Mail size={18} className="text-gray-400" />
            <input
              className="w-full py-3 outline-none"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <label className="block text-sm font-medium mb-2">Password</label>
          <div className="flex items-center gap-3 border rounded-xl px-4 mb-6 focus-within:ring-2 focus-within:ring-violet-300">
            <Lock size={18} className="text-gray-400" />
            <input
              className="w-full py-3 outline-none"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button disabled={loading} className="w-full bg-violet-700 hover:bg-violet-800 disabled:opacity-60 text-white rounded-xl py-3 font-semibold">
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="text-center text-gray-500 mt-6 text-sm">
            New to NoteNest?{" "}
            <Link to="/register" className="text-violet-700 font-semibold">
              Create an account
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
