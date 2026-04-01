import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api.js";
import socket from "../services/socket.js";
import { Bell, Ban } from "lucide-react";

const statusConfig = {
  aberto: { label: "Aberto", color: "#FF6B35", bg: "#FF6B3515" },
  preparando: { label: "Preparando", color: "#D97706", bg: "#D9770615" },
  pronto: { label: "Pronto!", color: "#00A868", bg: "#00A86815" },
  aguardando_pagamento: { label: "Aguard. pagamento", color: "#7C6AF5", bg: "#7C6AF515" },
  cancelado: { label: "Cancelado", color: "#FF3D6E", bg: "#FF3D6E15" },
  fechado: { label: "Fechado", color: "#888888", bg: "#88888815" },
};

export default function Pedidos() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ativos");
  const [showCancelar, setShowCancelar] = useState(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [erroCancelamento, setErroCancelamento] = useState("");
  const [cancelando, setCancelando] = useState(false);

  const fetchPedidos = useCallback(async () => {
    try {
      const { data } = await api.get("/food/pedidos");
      setPedidos(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPedidos();
    socket.on("pedido:novo", () => fetchPedidos());
    socket.on("pedido:atualizado", () => fetchPedidos());
    socket.on("pedido:cancelado", () => fetchPedidos());
    socket.on("pedido:status", p => {
      setPedidos(prev => prev.map(x => x.id === p.id ? p : x));
      if (p.status === "pronto" && "vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    });
    socket.on("pedido:fechado", () => fetchPedidos());
    socket.on("mesa:fechada", () => fetchPedidos());
    return () => {
      socket.off("pedido:novo");
      socket.off("pedido:atualizado");
      socket.off("pedido:cancelado");
      socket.off("pedido:status");
      socket.off("pedido:fechado");
      socket.off("mesa:fechada");
    };
  }, [fetchPedidos]);

  async function handleFecharMesa(mesaId) {
    try {
      await api.patch(`/food/mesas/${mesaId}/fechar`);
      await fetchPedidos();
    } catch (e) {
      console.error("Erro ao fechar mesa:", e);
    }
  }

  async function handleCancelar() {
    setErroCancelamento("");
    setCancelando(true);
    try {
      await api.patch(`/food/pedidos/${showCancelar.id}/cancelar`, {
        motivo: motivoCancelamento,
      });
      await fetchPedidos();
      setShowCancelar(null);
      setMotivoCancelamento("");
    } catch (e) {
      setErroCancelamento(e.response?.data?.error || "Erro ao cancelar pedido");
    } finally {
      setCancelando(false);
    }
  }

  function agruparPorMesa(lista) {
    const grupos = {};
    lista.forEach(p => {
      const key = p.mesaId ? `mesa-${p.mesaId}` : `balcao-${p.id}`;
      const label = p.mesa ? `Mesa ${String(p.mesa.numero).padStart(2, "0")}` : "Balcão";
      if (!grupos[key]) {
        grupos[key] = { key, label, mesaId: p.mesaId, pedidos: [], total: 0 };
      }
      grupos[key].pedidos.push(p);
      grupos[key].total += p.total;
    });
    return Object.values(grupos);
  }

  const ativos = pedidos.filter(p => !["fechado", "cancelado"].includes(p.status));
  const fechados = pedidos.filter(p => ["fechado", "cancelado"].includes(p.status));
  const prontos = ativos.filter(p => p.status === "pronto");

  const gruposAtivos = agruparPorMesa(ativos);
  const gruposFechados = agruparPorMesa(fechados);
  const grupos = filter === "ativos" ? gruposAtivos : gruposFechados;

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
        padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px",
        background: "var(--bg-card)", borderBottom: "0.5px solid var(--border)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button onClick={() => navigate("/")}
          style={{ background: "var(--bg-inner)", border: "0.5px solid var(--border)", color: "var(--muted)", width: "36px", height: "36px", borderRadius: "10px", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>Meus Pedidos</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "var(--muted)" }}>
            {gruposAtivos.length} mesas ativas
          </div>
        </div>
        {prontos.length > 0 && (
          <div style={{ background: "var(--green)", color: "#fff", borderRadius: "20px", padding: "4px 10px", fontSize: "12px", fontWeight: 700 }}>
            {prontos.length} prontos!
          </div>
        )}
      </div>

      <div style={{ padding: "20px" }}>

        {/* Alerta prontos */}
        {prontos.length > 0 && (
          <div style={{
            background: "#00A86815", border: "1px solid #00A86840",
            borderRadius: "14px", padding: "14px 16px", marginBottom: "20px",
            display: "flex", alignItems: "center", gap: "12px",
          }}>
            <Bell size={24} color="var(--green)" />
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--green)" }}>
                {prontos.length} pedido{prontos.length > 1 ? "s" : ""} pronto{prontos.length > 1 ? "s" : ""}!
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                {[...new Set(prontos.map(p => p.mesa ? `Mesa ${p.mesa.numero}` : "Balcão"))].join(", ")}
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {[
            { value: "ativos", label: `Ativos (${gruposAtivos.length})` },
            { value: "fechados", label: `Encerrados (${gruposFechados.length})` },
          ].map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              style={{
                flex: 1, padding: "10px", borderRadius: "10px", cursor: "pointer",
                border: "0.5px solid", fontSize: "13px", fontWeight: 500,
                background: filter === f.value ? "var(--accent-bg)" : "transparent",
                color: filter === f.value ? "var(--accent)" : "var(--muted)",
                borderColor: filter === f.value ? "var(--accent)" : "var(--border)",
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Grupos por mesa */}
        {grupos.length === 0 ? (
          <div className="card" style={{ padding: "40px", textAlign: "center" }}>
            <div style={{ color: "var(--muted)", fontSize: "14px" }}>
              Nenhum pedido {filter === "ativos" ? "ativo" : "encerrado"}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {grupos.map(grupo => {
              const temPronto = grupo.pedidos.some(p => p.status === "pronto");
              const todosAguardando = grupo.pedidos.every(p => p.status === "aguardando_pagamento");
              const podeFcharConta = grupo.mesaId && grupo.pedidos.some(p =>
                !["fechado", "aguardando_pagamento", "cancelado"].includes(p.status)
              );

              return (
                <div key={grupo.key} className="card" style={{
                  overflow: "hidden",
                  borderColor: temPronto ? "var(--green)" :
                    todosAguardando ? "#7C6AF5" : "var(--border)",
                }}>

                  {/* Header do grupo */}
                  <div style={{
                    padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
                    borderBottom: "0.5px solid var(--border)",
                    background: temPronto ? "#00A86808" :
                      todosAguardando ? "#7C6AF508" : "transparent",
                  }}>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>
                        {grupo.label}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                        {grupo.pedidos.length} pedido{grupo.pedidos.length > 1 ? "s" : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent)" }}>
                        R$ {grupo.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                      {todosAguardando && (
                        <div style={{ fontSize: "11px", color: "#7C6AF5", marginTop: "2px" }}>
                          Aguardando pagamento
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pedidos do grupo */}
                  <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {grupo.pedidos.map(p => {
                      const cfg = statusConfig[p.status] || statusConfig.aberto;
                      return (
                        <div key={p.id} style={{
                          background: "var(--bg-inner)", borderRadius: "10px", padding: "12px",
                          border: `0.5px solid ${p.status === "pronto" ? "var(--green)" : p.status === "cancelado" ? "#FF3D6E40" : "var(--border)"}`,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "var(--faint)" }}>
                                #{p.id}
                              </span>
                              <span style={{
                                fontSize: "10px", padding: "3px 8px", borderRadius: "20px",
                                background: cfg.bg, color: cfg.color, fontWeight: 600,
                              }}>
                                {cfg.label}
                              </span>
                            </div>
                            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent)" }}>
                              R$ {Number(p.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "8px" }}>
                            {p.itens?.slice(0, 2).map(ip => `${ip.quantidade}x ${ip.item?.nome}`).join(", ")}
                            {(p.itens?.length || 0) > 2 && ` +${p.itens.length - 2} itens`}
                          </div>

                          {/* Botão cancelar — só para pedidos abertos */}
                          {p.status === "aberto" && (
                            <button
                              onClick={e => { e.stopPropagation(); setShowCancelar(p); setErroCancelamento(""); }}
                              style={{
                                fontSize: "11px", padding: "6px 12px", borderRadius: "8px",
                                cursor: "pointer", border: "none", fontWeight: 600,
                                background: "#FF3D6E", color: "#fff",
                              }}>
                              Cancelar pedido
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Fechar conta da mesa */}
                  {podeFcharConta && (
                    <div style={{ padding: "12px 16px", borderTop: "0.5px solid var(--border)" }}>
                      <button
                        onClick={() => handleFecharMesa(grupo.mesaId)}
                        style={{
                          width: "100%", padding: "12px", borderRadius: "10px",
                          cursor: "pointer", border: "none", fontWeight: 700,
                          fontSize: "14px", background: "#7C6AF520", color: "#7C6AF5",
                        }}>
                        Fechar conta da {grupo.label}
                      </button>
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
      }}>
        <button onClick={() => navigate("/novo-pedido")}
          style={{ width: "100%", padding: "16px", borderRadius: "14px", cursor: "pointer", background: "var(--accent)", color: "#fff", border: "none", fontSize: "15px", fontWeight: 700 }}>
          + Novo Pedido
        </button>
      </div>

      {/* Modal — Cancelar Pedido */}
      {showCancelar && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "360px", padding: "24px" }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>Cancelar Pedido</span>
              <button
                onClick={() => { setShowCancelar(null); setMotivoCancelamento(""); setErroCancelamento(""); }}
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "18px" }}>
                ✕
              </button>
            </div>

            {/* Info do pedido */}
            <div style={{ background: "var(--bg-inner)", borderRadius: "12px", padding: "16px", textAlign: "center", marginBottom: "16px" }}>
              <div style={{ marginBottom: "8px" }}><Ban size={32} color="#FF3D6E" /></div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>
                Pedido #{showCancelar.id}
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                {showCancelar.mesa ? `Mesa ${showCancelar.mesa.numero}` : "Balcão"}
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                {showCancelar.itens?.slice(0, 3).map(ip => `${ip.quantidade}x ${ip.item?.nome}`).join(", ")}
              </div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#FF3D6E", marginTop: "8px" }}>
                R$ {Number(showCancelar.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Motivo */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{
                fontFamily: "'Space Mono', monospace", fontSize: "10px",
                letterSpacing: "0.15em", textTransform: "uppercase",
                color: "var(--faint)", display: "block", marginBottom: "6px",
              }}>
                Motivo (opcional)
              </label>
              <input className="input" type="text"
                placeholder="Ex: cliente desistiu, erro no pedido..."
                value={motivoCancelamento}
                onChange={e => setMotivoCancelamento(e.target.value)}
              />
            </div>

            {/* Erro */}
            {erroCancelamento && (
              <div style={{
                padding: "10px 12px", borderRadius: "8px", fontSize: "12px",
                color: "#FF3D6E", background: "#FF3D6E15",
                marginBottom: "12px", textAlign: "center",
              }}>
                {erroCancelamento}
              </div>
            )}

            {/* Ações */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => { setShowCancelar(null); setMotivoCancelamento(""); setErroCancelamento(""); }}
                style={{
                  flex: 1, padding: "14px", borderRadius: "12px", cursor: "pointer",
                  background: "var(--bg-inner)", color: "var(--muted)",
                  border: "0.5px solid var(--border)", fontSize: "13px",
                }}>
                Voltar
              </button>
              <button
                onClick={handleCancelar}
                disabled={cancelando}
                style={{
                  flex: 1, padding: "14px", borderRadius: "12px", cursor: "pointer",
                  background: "#FF3D6E", color: "#fff", border: "none",
                  fontSize: "14px", fontWeight: 700, opacity: cancelando ? 0.7 : 1,
                }}>
                {cancelando ? "Cancelando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}