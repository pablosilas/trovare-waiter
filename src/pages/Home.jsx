import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api.js";
import socket from "../services/socket.js";
import { useAuth } from "../contexts/useAuth.js";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext.jsx";

const mesaStatusConfig = {
  livre: { label: "Livre", color: "#00F5A0", bg: "#00F5A015" },
  ocupada: { label: "Ocupada", color: "#FF6B35", bg: "#FF6B3515" },
  reservada: { label: "Reservada", color: "#B8A8FF", bg: "#B8A8FF15" },
};

export default function Home() {
  const { garcom, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mesas, setMesas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchMesas = useCallback(async () => {
    try {
      const { data } = await api.get("/food/mesas");
      setMesas(data);
    } catch (e) {
      console.error("Erro ao buscar mesas:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMesas();

    // Atualiza mesas em tempo real
    socket.on("pedido:novo", () => fetchMesas());
    socket.on("pedido:atualizado", () => fetchMesas());
    socket.on("pedido:fechado", () => fetchMesas());
    socket.on("pedido:status", () => fetchMesas());

    return () => {
      socket.off("pedido:novo");
      socket.off("pedido:atualizado");
      socket.off("pedido:fechado");
      socket.off("pedido:status");
    };
  }, [fetchMesas]);

  const filtered = filter === "all" ? mesas : mesas.filter(m => m.status === filter);
  const livres = mesas.filter(m => m.status === "livre").length;
  const ocupadas = mesas.filter(m => m.status === "ocupada").length;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)" }}>
        <div style={{ color: "var(--muted)", fontSize: "13px" }}>Carregando...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: "100px" }}>

      {/* Header */}
      <div style={{
        padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--bg-card)", borderBottom: "0.5px solid var(--border)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "32px", height: "32px",
            background: "linear-gradient(135deg, #FF6B35, #E55A25)",
            borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 26 26" fill="none">
              <path d="M4 13 L13 4 L22 13 L13 22 Z" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
              <path d="M9 13 L13 9 L17 13 L13 17 Z" fill="#fff" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.5px", color: "var(--text)" }}>
              Trovare
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", letterSpacing: "0.2em", color: "var(--accent)", textTransform: "uppercase" }}>
              waiter
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "12px", color: "var(--text)", fontWeight: 500 }}>{garcom?.name}</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "var(--muted)" }}>
              {garcom?.tenant?.name}
            </div>
          </div>
          <button onClick={toggleTheme}
            style={{
              background: "var(--bg-inner)", border: "0.5px solid var(--border)",
              color: "var(--muted)", padding: "6px 10px", borderRadius: "8px",
              fontSize: "14px", cursor: "pointer",
            }}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={logout}
            style={{ background: "#FF3D6E15", color: "#FF3D6E", border: "0.5px solid #FF3D6E30", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", cursor: "pointer" }}>
            Sair
          </button>
        </div>
      </div>

      <div style={{ padding: "20px" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
          {[
            { label: "Total", value: mesas.length, color: "var(--text)" },
            { label: "Livres", value: livres, color: "#00F5A0" },
            { label: "Ocupadas", value: ocupadas, color: "var(--accent)" },
          ].map((s, i) => (
            <div key={i} className="card" style={{ padding: "14px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "var(--faint)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {s.label}
              </div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        {/* Filtros */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "20px", overflowX: "auto", paddingBottom: "4px" }}>
          {[
            { value: "all", label: "Todas" },
            { value: "livre", label: "Livres" },
            { value: "ocupada", label: "Ocupadas" },
            { value: "reservada", label: "Reservadas" },
          ].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              style={{
                fontSize: "11px", padding: "6px 10px", borderRadius: "20px",
                cursor: "pointer", border: "0.5px solid", whiteSpace: "nowrap",
                fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500,
                background: filter === f.value ? "var(--accent-bg)" : "transparent",
                color: filter === f.value ? "var(--accent)" : "var(--muted)",
                borderColor: filter === f.value ? "var(--accent)" : "var(--border)",
                transition: "all 0.15s",
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Grid de mesas */}
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: "40px", textAlign: "center" }}>
            <div style={{ color: "var(--muted)", fontSize: "14px" }}>Nenhuma mesa encontrada</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {filtered.map(mesa => {
              const cfg = mesaStatusConfig[mesa.status] || mesaStatusConfig.livre;
              const pedidoAtivo = mesa.pedidos?.find(p => p.status !== "fechado");
              return (
                <div key={mesa.id}
                  onClick={() => navigate(`/mesa/${mesa.id}`)}
                  style={{
                    background: "var(--bg-card)",
                    border: `0.5px solid ${mesa.status === "ocupada" ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: "14px", padding: "16px",
                    cursor: "pointer", transition: "all 0.15s",
                    position: "relative", overflow: "hidden",
                  }}>

                  {/* Indicador de status */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: "3px",
                    background: cfg.color, opacity: 0.8,
                  }} />

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "var(--faint)", marginBottom: "2px" }}>
                        MESA
                      </div>
                      <div style={{ fontSize: "32px", fontWeight: 700, color: cfg.color, lineHeight: 1 }}>
                        {String(mesa.numero).padStart(2, "0")}
                      </div>
                    </div>
                    <span style={{
                      fontSize: "10px", padding: "4px 8px", borderRadius: "6px",
                      background: cfg.bg, color: cfg.color,
                      border: `0.5px solid ${cfg.color}30`,
                      fontWeight: 500,
                    }}>
                      {cfg.label}
                    </span>
                  </div>

                  <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: pedidoAtivo ? "10px" : "0" }}>
                    {mesa.capacidade} lugares
                  </div>

                  {pedidoAtivo && (
                    <div className="inner" style={{ padding: "10px" }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "var(--faint)", marginBottom: "4px" }}>
                        PEDIDO #{pedidoAtivo.id}
                      </div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent)" }}>
                        R$ {Number(pedidoAtivo.total).toFixed(2)}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                        {pedidoAtivo.itens?.length || 0} itens
                      </div>
                    </div>
                  )}

                  {mesa.status === "livre" && (
                    <div style={{
                      marginTop: "10px", padding: "8px", borderRadius: "8px",
                      background: "#00F5A015", color: "#00F5A0",
                      fontSize: "12px", fontWeight: 600, textAlign: "center",
                    }}>
                      + Abrir pedido
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "var(--bg-card)", borderTop: "0.5px solid var(--border)",
        padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
        display: "flex", gap: "10px",
      }}>
        <button
          onClick={() => navigate("/pedidos")}
          style={{
            flex: 1, padding: "14px", borderRadius: "12px", cursor: "pointer",
            background: "var(--bg-inner)", color: "var(--muted)",
            border: "0.5px solid var(--border)", fontSize: "13px", fontWeight: 500,
          }}>
          Meus Pedidos
        </button>
        <button
          onClick={() => navigate("/novo-pedido")}
          style={{
            flex: 2, padding: "14px", borderRadius: "12px", cursor: "pointer",
            background: "var(--accent)", color: "#fff",
            border: "none", fontSize: "14px", fontWeight: 700,
          }}>
          + Novo Pedido
        </button>
      </div>
    </div>
  );
}