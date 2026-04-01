import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth.js";
import api from "../services/api.js";
import { Armchair, Bike, Send } from "lucide-react";
import EnderecoForm from "../components/EnderecoForm.jsx";

const formasPagamento = [
  { value: "pix", label: "PIX", color: "#00A868" },
  { value: "dinheiro", label: "Dinheiro", color: "#D97706" },
  { value: "credito", label: "Cartão Crédito", color: "#7C6AF5" },
  { value: "debito", label: "Cartão Débito", color: "#0891B2" },
  { value: "vr", label: "VR", color: "#E55A25" },
  { value: "va", label: "VA", color: "#0369A1" },
  { value: "ticket", label: "Ticket", color: "#BE185D" },
  { value: "transferencia", label: "Transferência", color: "#15803D" },
];

function formatPhone(value) {
  const nums = value.replace(/\D/g, "").slice(0, 11);
  if (nums.length <= 2) return `(${nums}`;
  if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  if (nums.length <= 11) return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
  return value;
}

function formatPrice(value) {
  const nums = value.replace(/\D/g, "");
  if (!nums) return "";
  return (parseInt(nums, 10) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

function parsePrice(formatted) {
  return parseFloat(formatted.replace(/\./g, "").replace(",", ".")) || 0;
}

export default function NovoPedido() {
  const navigate = useNavigate();
  const { garcom } = useAuth();
  const [mesas, setMesas] = useState([]);
  const [cardapio, setCardapio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState(1);
  const [origem, setOrigem] = useState("local");
  const [mesaId, setMesaId] = useState(null);
  const [carrinho, setCarrinho] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [search, setSearch] = useState("");
  const [freteDisplay, setFreteDisplay] = useState("");
  const [delivery, setDelivery] = useState({
    nomeCliente: "",
    telefone: "",
    endereco: {
      cep: "", logradouro: "", numero: "",
      complemento: "", bairro: "", cidade: "", estado: "",
    },
    observacao: "",
    formaPagamento: "pix",
  });

  const fetchAll = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([
        api.get("/food/mesas"),
        api.get("/food/cardapio/categorias"),
      ]);
      setMesas(m.data);
      setCardapio(c.data);
      if (c.data.length > 0) setActiveCat(c.data[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function addItem(item) {
    setCarrinho(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.map(i => i.id === item.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      return [...prev, { ...item, quantidade: 1, obs: "" }];
    });
  }

  function removeItem(itemId) {
    setCarrinho(prev => {
      const exists = prev.find(i => i.id === itemId);
      if (exists?.quantidade > 1) return prev.map(i => i.id === itemId ? { ...i, quantidade: i.quantidade - 1 } : i);
      return prev.filter(i => i.id !== itemId);
    });
  }

  function getQtd(itemId) {
    return carrinho.find(i => i.id === itemId)?.quantidade || 0;
  }

  const totalCarrinho = carrinho.reduce((s, i) => s + i.preco * i.quantidade, 0);
  const frete = parsePrice(freteDisplay);
  const totalFinal = totalCarrinho + frete;
  const mesaSelecionada = mesas.find(m => m.id === mesaId);
  const catAtiva = cardapio.find(c => c.id === activeCat);
  const itensFiltrados = catAtiva?.itens.filter(i =>
    i.disponivel && i.nome.toLowerCase().includes(search.toLowerCase())
  ) || [];

  function formatarEndereco(e) {
    const parts = [
      e.logradouro,
      e.numero ? `nº ${e.numero}` : "",
      e.complemento,
      e.bairro,
      e.cidade,
      e.estado,
      e.cep,
    ].filter(Boolean);
    return parts.join(", ");
  }

  async function handleEnviar() {
    if (carrinho.length === 0) return;
    setSending(true);
    try {
      const payload = origem === "local"
        ? { mesaId: mesaId || null, garcomId: garcom?.id || null, origem: "local" }
        : {
          origem: "delivery",
          garcomId: garcom?.id || null,
          nomeCliente: delivery.nomeCliente,
          telefone: delivery.telefone,
          endereco: formatarEndereco(delivery.endereco), // ← formata aqui
          observacao: delivery.observacao,
          frete: frete,
          formaPagamento: delivery.formaPagamento,
        };

      const { data: pedido } = await api.post("/food/pedidos", payload);

      for (const item of carrinho) {
        await api.post(`/food/pedidos/${pedido.id}/itens`, {
          itemId: item.id,
          quantidade: item.quantidade,
          obs: item.obs || "",
        });
      }

      navigate("/pedidos");
    } catch (e) {
      console.error("Erro ao criar pedido:", e);
    } finally {
      setSending(false);
    }
  }

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
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate("/")}
          style={{ background: "var(--bg-inner)", border: "0.5px solid var(--border)", color: "var(--muted)", width: "36px", height: "36px", borderRadius: "10px", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>Novo Pedido</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Passo {step} de 3
          </div>
        </div>
        {carrinho.length > 0 && (
          <div style={{ background: "var(--accent)", color: "#fff", borderRadius: "20px", padding: "4px 10px", fontSize: "12px", fontWeight: 700 }}>
            {carrinho.reduce((s, i) => s + i.quantidade, 0)} itens
          </div>
        )}
      </div>

      {/* Progress */}
      <div style={{ display: "flex", gap: "4px", padding: "12px 20px", background: "var(--bg-card)", borderBottom: "0.5px solid var(--border)" }}>
        {["Tipo/Mesa", "Cardápio", "Confirmar"].map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              height: "3px", borderRadius: "2px", marginBottom: "4px",
              background: step > i ? "var(--accent)" : "var(--border)",
              transition: "background 0.3s",
            }} />
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.08em", color: step > i ? "var(--accent)" : "var(--faint)" }}>
              {s}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: "20px" }}>

        {/* Step 1 — Tipo + Mesa/Delivery */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Tipo */}
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>
                Tipo do pedido
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[
                  { value: "local", label: "Local", icon: Armchair, desc: "Mesa ou balcão" },
                  { value: "delivery", label: "Delivery", icon: Bike, desc: "Entrega em domicílio" },
                ].map(t => (
                  <button key={t.value} onClick={() => setOrigem(t.value)}
                    style={{
                      padding: "14px 12px", borderRadius: "12px", cursor: "pointer",
                      border: "0.5px solid", textAlign: "left", transition: "all 0.15s",
                      background: origem === t.value ? "var(--accent-bg)" : "var(--bg-card)",
                      borderColor: origem === t.value ? "var(--accent)" : "var(--border)",
                    }}>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: origem === t.value ? "var(--accent)" : "var(--text)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <t.icon size={15} /> {t.label}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Local — seleciona mesa */}
            {origem === "local" && (
              <div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>
                  Mesa
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {mesas.map(mesa => {
                    const isSelected = mesaId === mesa.id;
                    const isOcupada = mesa.status === "ocupada";
                    return (
                      <div key={mesa.id}
                        onClick={() => !isOcupada && setMesaId(mesa.id)}
                        style={{
                          background: isSelected ? "var(--accent-bg)" : "var(--bg-card)",
                          border: `0.5px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                          borderRadius: "14px", padding: "16px",
                          cursor: isOcupada ? "not-allowed" : "pointer",
                          opacity: isOcupada ? 0.5 : 1,
                          transition: "all 0.15s", position: "relative", overflow: "hidden",
                        }}>
                        {isSelected && (
                          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "var(--accent)" }} />
                        )}
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "var(--faint)", marginBottom: "2px" }}>MESA</div>
                        <div style={{ fontSize: "28px", fontWeight: 700, color: isSelected ? "var(--accent)" : "var(--text)", lineHeight: 1 }}>
                          {String(mesa.numero).padStart(2, "0")}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>{mesa.capacidade} lugares</div>
                        <div style={{ fontSize: "11px", marginTop: "2px", color: mesa.status === "livre" ? "var(--green)" : "var(--accent)" }}>
                          {mesa.status === "livre" ? "Disponível" : "Ocupada"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Delivery — dados do cliente */}
            {origem === "delivery" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
                  Dados do cliente
                </div>

                <div>
                  <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--faint)", display: "block", marginBottom: "6px" }}>
                    Nome *
                  </label>
                  <input className="input" placeholder="Nome completo"
                    value={delivery.nomeCliente}
                    onChange={e => setDelivery(d => ({ ...d, nomeCliente: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--faint)", display: "block", marginBottom: "6px" }}>
                    Telefone
                  </label>
                  <input className="input" placeholder="(11) 99999-9999"
                    value={delivery.telefone}
                    onChange={e => setDelivery(d => ({ ...d, telefone: formatPhone(e.target.value) }))}
                  />
                </div>

                <div>
                  <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--faint)", display: "block", marginBottom: "6px" }}>
                    Endereço de entrega
                  </label>
                  <EnderecoForm
                    value={delivery.endereco}
                    onChange={endereco => setDelivery(d => ({ ...d, endereco }))}
                    inputStyle={{
                      background: "var(--bg-card)",
                      border: "0.5px solid var(--border)",
                      color: "var(--text)",
                      width: "100%",
                      fontSize: "14px",
                      padding: "12px 14px",
                      borderRadius: "10px",
                      outline: "none",
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--faint)", display: "block", marginBottom: "6px" }}>
                    Frete (R$)
                  </label>
                  <div className="input" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 14px" }}>
                    <span style={{ color: "var(--muted)", fontSize: "14px", flexShrink: 0 }}>R$</span>
                    <input placeholder="0,00" value={freteDisplay}
                      onChange={e => setFreteDisplay(formatPrice(e.target.value))}
                      style={{ background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: "14px", width: "100%" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--faint)", display: "block", marginBottom: "6px" }}>
                    Observação
                  </label>
                  <input className="input" placeholder="Ex: sem cebola, alergia..."
                    value={delivery.observacao}
                    onChange={e => setDelivery(d => ({ ...d, observacao: e.target.value }))}
                  />
                </div>

                {/* Forma de pagamento */}
                <div>
                  <label style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--faint)", display: "block", marginBottom: "8px" }}>
                    Forma de pagamento
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    {formasPagamento.map(f => (
                      <button key={f.value}
                        onClick={() => setDelivery(d => ({ ...d, formaPagamento: f.value }))}
                        style={{
                          padding: "10px 12px", borderRadius: "10px", cursor: "pointer",
                          border: "0.5px solid", textAlign: "left", transition: "all 0.15s",
                          fontFamily: "'Space Grotesk', sans-serif", fontSize: "13px", fontWeight: 500,
                          background: delivery.formaPagamento === f.value ? f.color + "20" : "var(--bg-inner)",
                          color: delivery.formaPagamento === f.value ? f.color : "var(--muted)",
                          borderColor: delivery.formaPagamento === f.value ? f.color + "50" : "var(--border)",
                        }}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button onClick={() => setStep(2)}
              style={{ width: "100%", padding: "16px", borderRadius: "14px", cursor: "pointer", background: "var(--accent)", color: "#fff", border: "none", fontSize: "15px", fontWeight: 700 }}>
              Próximo — Escolher itens
            </button>
          </div>
        )}

        {/* Step 2 — Cardápio */}
        {step === 2 && (
          <div>
            <input className="input" placeholder="Buscar item..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ marginBottom: "16px" }}
            />

            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", overflowX: "auto", paddingBottom: "4px" }}>
              {cardapio.map(cat => (
                <button key={cat.id} onClick={() => { setActiveCat(cat.id); setSearch(""); }}
                  style={{
                    padding: "8px 14px", borderRadius: "20px", cursor: "pointer",
                    border: "0.5px solid", fontSize: "12px", fontWeight: 500, whiteSpace: "nowrap",
                    background: activeCat === cat.id ? "var(--accent-bg)" : "transparent",
                    color: activeCat === cat.id ? "var(--accent)" : "var(--muted)",
                    borderColor: activeCat === cat.id ? "var(--accent)" : "var(--border)",
                  }}>
                  {cat.nome}
                  <span style={{ marginLeft: "6px", fontFamily: "'Space Mono', monospace", fontSize: "10px", opacity: 0.6 }}>
                    {cat.itens.filter(i => i.disponivel).length}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "80px" }}>
              {itensFiltrados.length === 0 ? (
                <div className="card" style={{ padding: "32px", textAlign: "center" }}>
                  <div style={{ color: "var(--muted)", fontSize: "14px" }}>Nenhum item encontrado</div>
                </div>
              ) : (
                itensFiltrados.map(item => {
                  const qtd = getQtd(item.id);
                  return (
                    <div key={item.id} className="card" style={{ padding: "14px", display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", marginBottom: "2px" }}>{item.nome}</div>
                        {item.descricao && (
                          <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "4px" }}>{item.descricao}</div>
                        )}
                        <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--accent)" }}>
                          R$ {Number(item.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                        {qtd > 0 && (
                          <>
                            <button onClick={() => removeItem(item.id)}
                              style={{ width: "32px", height: "32px", borderRadius: "10px", border: "0.5px solid var(--border)", background: "var(--bg-inner)", color: "var(--text)", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              −
                            </button>
                            <span style={{ fontSize: "16px", fontWeight: 700, color: "var(--accent)", minWidth: "20px", textAlign: "center" }}>
                              {qtd}
                            </span>
                          </>
                        )}
                        <button onClick={() => addItem(item)}
                          style={{ width: "32px", height: "32px", borderRadius: "10px", border: "none", background: "var(--accent)", color: "#fff", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          +
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Step 3 — Confirmar */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)" }}>
              Confirmar pedido
            </div>

            {/* Info do pedido */}
            <div className="card" style={{ padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "var(--muted)", fontSize: "13px" }}>Tipo</span>
                <span style={{ color: "var(--text)", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                  {origem === "local" ? <><Armchair size={13} /> Local</> : <><Bike size={13} /> Delivery</>}
                </span>
              </div>
              {origem === "local" && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)", fontSize: "13px" }}>Mesa</span>
                  <span style={{ color: "var(--text)", fontSize: "13px", fontWeight: 600 }}>
                    {mesaSelecionada ? `Mesa ${mesaSelecionada.numero}` : "Balcão"}
                  </span>
                </div>
              )}
              {origem === "delivery" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ color: "var(--muted)", fontSize: "13px" }}>Cliente</span>
                    <span style={{ color: "var(--text)", fontSize: "13px", fontWeight: 600 }}>{delivery.nomeCliente}</span>
                  </div>
                  {delivery.telefone && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ color: "var(--muted)", fontSize: "13px" }}>Telefone</span>
                      <span style={{ color: "var(--text)", fontSize: "13px" }}>{delivery.telefone}</span>
                    </div>
                  )}
                  {delivery.endereco && (
                    <div style={{ marginBottom: "6px" }}>
                      <span style={{ color: "var(--muted)", fontSize: "13px" }}>Endereço</span>
                      <div style={{ color: "var(--text)", fontSize: "13px", marginTop: "2px" }}>
                        {formatarEndereco(delivery.endereco)}
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ color: "var(--muted)", fontSize: "13px" }}>Pagamento</span>
                    <span style={{ color: "var(--accent)", fontSize: "13px", fontWeight: 600 }}>
                      {formasPagamento.find(f => f.value === delivery.formaPagamento)?.label}
                    </span>
                  </div>
                  {frete > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--muted)", fontSize: "13px" }}>Frete</span>
                      <span style={{ color: "var(--text)", fontSize: "13px" }}>
                        R$ {frete.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Itens */}
            <div className="card" style={{ padding: "16px" }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "var(--faint)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Itens
              </div>
              {carrinho.map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div>
                    <div style={{ fontSize: "13px", color: "var(--text)", fontWeight: 500 }}>{item.nome}</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {item.quantidade}x · R$ {Number(item.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--accent)" }}>
                    R$ {(item.quantidade * item.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}

              <div style={{ borderTop: "0.5px solid var(--border)", paddingTop: "12px", marginTop: "4px" }}>
                {frete > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", color: "var(--muted)" }}>Subtotal</span>
                    <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                      R$ {totalCarrinho.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {frete > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", color: "var(--muted)" }}>Frete</span>
                    <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                      R$ {frete.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>Total</span>
                  <span style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent)" }}>
                    R$ {totalFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      {step === 2 && carrinho.length > 0 && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "var(--bg-card)", borderTop: "0.5px solid var(--border)",
          padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
        }}>
          <button onClick={() => setStep(3)}
            style={{ width: "100%", padding: "16px", borderRadius: "14px", cursor: "pointer", background: "var(--accent)", color: "#fff", border: "none", fontSize: "15px", fontWeight: 700 }}>
            Revisar · R$ {totalCarrinho.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </button>
        </div>
      )}

      {step === 3 && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "var(--bg-card)", borderTop: "0.5px solid var(--border)",
          padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
          display: "flex", gap: "10px",
        }}>
          <button onClick={() => setStep(2)}
            style={{ flex: 1, padding: "14px", borderRadius: "12px", cursor: "pointer", background: "var(--bg-inner)", color: "var(--muted)", border: "0.5px solid var(--border)", fontSize: "13px" }}>
            Voltar
          </button>
          <button onClick={handleEnviar} disabled={sending}
            style={{ flex: 2, padding: "14px", borderRadius: "12px", cursor: "pointer", background: "var(--accent)", color: "#fff", border: "none", fontSize: "15px", fontWeight: 700, opacity: sending ? 0.7 : 1 }}>
            {sending ? "Enviando..." : <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}><Send size={16} /> Enviar pedido</span>}
          </button>
        </div>
      )}
    </div>
  );
}