import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/useAuth.js";
import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import Mesa from "./pages/Mesa.jsx";
import NovoPedido from "./pages/NovoPedido.jsx";
import Pedidos from "./pages/Pedidos.jsx";
import PedidoDetalhe from "./pages/PedidoDetalhe.jsx";

function PrivateRoute({ children }) {
  const { garcom, loading } = useAuth();
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg)" }}>
      <div style={{ color: "var(--muted)", fontSize: "13px" }}>Carregando...</div>
    </div>
  );
  if (!garcom) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/mesa/:id" element={<PrivateRoute><Mesa /></PrivateRoute>} />
        <Route path="/novo-pedido" element={<PrivateRoute><NovoPedido /></PrivateRoute>} />
        <Route path="/pedidos" element={<PrivateRoute><Pedidos /></PrivateRoute>} />
        <Route path="/pedido/:id" element={<PrivateRoute><PedidoDetalhe /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}