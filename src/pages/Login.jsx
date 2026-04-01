import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth.js";
import PasswordInput from "../components/PasswordInput.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "24px", background: "var(--bg)",
    }}>
      <div style={{ width: "100%", maxWidth: "360px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{
            width: "64px", height: "64px", margin: "0 auto 16px",
            background: "linear-gradient(135deg, #FF6B35, #E55A25)",
            borderRadius: "18px", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="32" height="32" viewBox="0 0 26 26" fill="none">
              <path d="M4 13 L13 4 L22 13 L13 22 Z" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
              <path d="M9 13 L13 9 L17 13 L13 17 Z" fill="#fff" />
            </svg>
          </div>
          <div style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-1px", color: "var(--text)" }}>
            Trovare
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.25em", color: "var(--accent)", textTransform: "uppercase", marginTop: "4px" }}>
            waiter
          </div>
          <p style={{ color: "var(--muted)", fontSize: "14px", marginTop: "8px" }}>
            Entre com suas credenciais
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--faint)", display: "block", marginBottom: "6px" }}>
              Usuário
            </label>
            <input className="input" type="text" placeholder="seu.usuario"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              required autoComplete="username"
              style={{ fontFamily: "'Space Mono', monospace" }}
            />
          </div>
          <div>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--faint)", display: "block", marginBottom: "6px" }}>
              Senha
            </label>
            <PasswordInput
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              style={{
                background: "var(--bg-card)",
                border: "0.5px solid var(--border)",
                color: "var(--text)",
                width: "100%",
                fontSize: "14px",
                padding: "12px 14px",
                borderRadius: "10px",
                outline: "none",
              }}
            />
          </div>

          {error && (
            <div style={{ padding: "12px", borderRadius: "10px", fontSize: "13px", color: "#E55A25", background: "#FF6B3515", textAlign: "center", border: "0.5px solid #FF6B3530" }}>
              {error}
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={loading}
            style={{ opacity: loading ? 0.7 : 1, marginTop: "8px" }}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "var(--faint)", fontSize: "11px", marginTop: "32px", fontFamily: "'Space Mono', monospace" }}>
          trovare waiter © 2026
        </p>
      </div>
    </div>
  );
}