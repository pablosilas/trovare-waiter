import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api.js";
import socket from "../services/socket.js";
import { CheckCircle, ChefHat } from "lucide-react";

const statusConfig = {
  aberto: { label: "Aberto", color: "#FF6B35" },
  preparando: { label: "Preparando", color: "#F59E0B" },
  pronto: { label: "Pronto!", color: "#00F5A0" },
  fechado: { label: "Fechado", color: "#3A3A5A" },
};

export default function PedidoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPedido = useCallback(async () => {
    try {
      const { data } = await api.get(`/food/pedidos/${id}`);
      setPedido(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPedido();
    socket.on("pedido:status", p => {
      if (p.id === Number(id)) {
        setPedido(p);
        if (p.status === "pronto" && "vibrate" in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      }
    });
    return () => socket.off("pedido:status");
  }, [fetchPedido, id]);

  if (loading || !pedido) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)" }}>
        <div style={{ color: "var(--muted)", fontSize: "13px" }}>Carregando...</div>
      </div>
    );
  }

  const cfg = statusConfig[pedido.status] || statusConfig.aberto;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: "40px" }}>

      {/* Header */}
      <div style={{
        padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px",
        background: "var(--bg-card)", borderBottom: "0.5px solid var(--border)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button onClick={() => navigate(-1)}
          style={{ background: "var(--bg-inner)", border: "0.5px solid var(--border)", color: "var(--muted)", width: "36px", height: "36px", borderRadius: "10px", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
            Pedido #{pedido.id}
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "var(--muted)" }}>
            {pedido.mesa ? `Mesa ${pedido.mesa.numero}` : "Balcão"}
          </div>
        </div>
        <span style={{
          fontSize: "12px", padding: "6px 12px", borderRadius: "20px",
          background: cfg.color + "20", color: cfg.color, fontWeight: 700,
        }}>
          {cfg.label}
        </span>
      </div>

      <div style={{ padding: "20px" }}>

        {/* Status visual */}
        {pedido.status === "pronto" && (
          <div style={{
            background: "#00F5A015", border: "1px solid #00F5A040",
            borderRadius: "14px", padding: "20px", marginBottom: "20px", textAlign: "center",
          }}>
            <div style={{ marginBottom: "8px" }}><CheckCircle size={40} color="#00F5A0" /></div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#00F5A0" }}>Pedido pronto!</div>
            <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>Pode servir o cliente</div>
          </div>
        )}

        {pedido.status === "preparando" && (
          <div style={{
            background: "#F59E0B15", border: "1px solid #F59E0B40",
            borderRadius: "14px", padding: "20px", marginBottom: "20px", textAlign: "center",
          }}>
            <div style={{ marginBottom: "8px" }}><ChefHat size={40} color="#F59E0B" /></div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#F59E0B" }}>Preparando...</div>
            <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: "4px" }}>A cozinha está preparando seu pedido</div>
          </div>
        )}

        {/* Itens */}
        <div className="card" style={{ padding: "16px", marginBottom: "16px" }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "var(--faint)", marginBottom: "14px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Itens
          </div>
          {pedido.itens?.map(ip => (
            <div key={ip.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <div style={{ fontSize: "14px", color: "var(--text)", fontWeight: 500 }}>{ip.item?.nome}</div>
                {ip.obs && <div style={{ fontSize: "11px", color: "var(--muted)", fontStyle: "italic" }}>"{ip.obs}"</div>}
                <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                  {ip.quantidade}x · R$ {Number(ip.preco).toFixed(2)}
                </div>
              </div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--accent)" }}>
                R$ {(ip.quantidade * ip.preco).toFixed(2)}
              </div>
            </div>
          ))}
          <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: "12px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text)" }}>Total</span>
            <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent)" }}>
              R$ {Number(pedido.total).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "var(--muted)", fontSize: "13px" }}>Mesa</span>
            <span style={{ color: "var(--text)", fontSize: "13px", fontWeight: 600 }}>
              {pedido.mesa ? `Mesa ${pedido.mesa.numero}` : "Balcão"}
            </span>
          </div>
          {pedido.garcom && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "var(--muted)", fontSize: "13px" }}>Garçom</span>
              <span style={{ color: "var(--text)", fontSize: "13px", fontWeight: 600 }}>{pedido.garcom.nome}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--muted)", fontSize: "13px" }}>Horário</span>
            <span style={{ fontFamily: "'Space Mono', monospace", color: "var(--text)", fontSize: "12px" }}>
              {new Date(pedido.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
        
      </div>
    </div>
  );
}