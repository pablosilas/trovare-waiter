import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api.js";
import socket from "../services/socket.js";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [garcom, setGarcom] = useState(null);
  const [loading, setLoading] = useState(true);

  function logout() {
    localStorage.removeItem("trovare-waiter-token");
    delete api.defaults.headers.common["Authorization"];
    socket.disconnect();
    setGarcom(null);
  }

  useEffect(() => {
    const token = localStorage.getItem("trovare-waiter-token");
    if (!token) { setLoading(false); return; }

    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    api.get("/auth/me/garcom")
      .then(({ data }) => {
        setGarcom(data);
        socket.connect();
        socket.emit("join-tenant", data.tenant.id);
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    const { data } = await api.post("/auth/login/garcom", { username, password });
    localStorage.setItem("trovare-waiter-token", data.token);
    api.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;

    // ← seta o garcom diretamente com os dados do login
    setGarcom(data.garcom);

    socket.connect();
    socket.emit("join-tenant", data.garcom.tenant.id);

    return data;
  }

  return (
    <AuthContext.Provider value={{ garcom, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}