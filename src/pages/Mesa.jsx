import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api.js";
import socket from "../services/socket.js";
import { Utensils } from "lucide-react";

const statusConfig = {
  aberto: { label: "Aberto", color: "#FF6B35" },
  preparando: { label: "Preparando", color: "#F59E0B" },
  pronto: { label: "Pronto!", color: "#00F5A0" },
  fechado: { label: "Fechado", color: "#3A3A5A" },
};

export default function Mesa() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mesa, setMesa] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMesa = useCallback(async () => {
    try {
      const [m, p] = await Promise.all([
        api.get("/food/mesas"),
        api.get("/food/pedidos"),
      ]);
      const found = m.data.find(mesa => mesa.id === Number(id));
      setMesa(found);
      setPedidos(p.data.filter(p => p.mesaId === Number(id) && p.status !== "fechado"));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMesa();
    socket.on("pedido:status", () => fetchMesa());
    socket.on("pedido:atualizado", () => fetchMesa());
    socket.on("pedido:fechado", () => fetchMesa());
    return () => {
      socket.off("pedido:status");
      socket.off("pedido:atualizado");
      socket.off("pedido:fechado");
    };
  }, [fetchMesa]);

  if (loading || !mesa) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)" }}>
        <div style={{ color: "var(--muted)", fontSize: "13px" }}>Carregando...</div>
      </div>
    );
  }

  const totalMesa = pedidos.reduce((s, p) => s + p.total, 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: "100px" }}>

      {/* Header */}
      <div style={{
        padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px",
        background: "var(--bg-card)", borderBottom: "0.5px solid var(--border)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button onClick={() => navigate("/")}
          style={{ background: "var(--bg-inner)", border: "0.5px solid var(--border)", color: "var(--muted)", width: "36px", height: "36px", borderRadius: "10px", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
            Mesa {String(mesa.numero).padStart(2, "0")}
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "var(--muted)" }}>
            {mesa.capacidade} lugares · {mesa.status}
          </div>
        </div>
        {totalMesa > 0 && (
          <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent)" }}>
            R$ {totalMesa.toFixed(2)}
          </div>
        )}
      </div>

      <div style={{ padding: "20px" }}>

        {pedidos.length === 0 ? (
          <div className="card" style={{ padding: "40px", textAlign: "center", marginBottom: "20px" }}>
            <div style={{ marginBottom: "12px" }}><Utensils size={40} color="var(--muted)" /></div>
            <div style={{ color: "var(--text)", fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>
              Mesa livre
            </div>
            <div style={{ color: "var(--muted)", fontSize: "13px" }}>
              Nenhum pedido ativo nessa mesa
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
            {pedidos.map(p => {
              const cfg = statusConfig[p.status] || statusConfig.aberto;
              return (
                <div key={p.id} className="card" style={{ padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "var(--faint)" }}>
                      PEDIDO #{p.id}
                    </div>
                    <span style={{
                      fontSize: "11px", padding: "4px 10px", borderRadius: "20px",
                      background: cfg.color + "20", color: cfg.color, fontWeight: 600,
                    }}>
                      {cfg.label}
                    </span>
                  </div>

                  {p.itens?.map(ip => (
                    <div key={ip.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <div>
                        <div style={{ fontSize: "14px", color: "var(--text)", fontWeight: 500 }}>{ip.item?.nome}</div>
                        {ip.obs && <div style={{ fontSize: "11px", color: "var(--muted)" }}>{ip.obs}</div>}
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>{ip.quantidade}x</div>
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--accent)" }}>
                        R$ {(ip.quantidade * ip.preco).toFixed(2)}
                      </div>
                    </div>
                  ))}

                  <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: "10px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", color: "var(--muted)" }}>Subtotal</span>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--accent)" }}>
                      R$ {Number(p.total).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "var(--bg-card)", borderTop: "0.5px solid var(--border)",
        padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
        display: "flex", gap: "10px",
      }}>
        <button onClick={() => navigate(`/novo-pedido?mesa=${mesa.id}`)}
          style={{ flex: 1, padding: "14px", borderRadius: "12px", cursor: "pointer", background: "var(--accent)", color: "#fff", border: "none", fontSize: "14px", fontWeight: 700 }}>
          + Adicionar pedido
        </button>
      </div>
    </div>
  );
}