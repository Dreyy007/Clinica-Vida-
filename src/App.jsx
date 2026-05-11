import { useState, useEffect, useCallback } from "react";
import { api } from "./api";

const theme = {
  primary: "#4B6CB7", primaryLight: "#EEF2FF", primaryDark: "#2D4A8A",
  bg: "#F4F6FB", surface: "#FFFFFF", border: "#E2E8F0",
  text: "#1A202C", textMuted: "#64748B",
  danger: "#E53E3E", dangerLight: "#FFF5F5",
  success: "#38A169", successLight: "#F0FFF4",
};

const STATUS_COLORS = {
  agendada: { bg: "#EFF6FF", text: "#1D4ED8", label: "Agendada" },
  realizada: { bg: "#F0FFF4", text: "#15803D", label: "Realizada" },
  cancelada: { bg: "#FFF5F5", text: "#B91C1C", label: "Cancelada" },
};

const TIPO_LABEL = { admin: "Administrador", psicologo: "Psicólogo(a)", estagiario: "Estagiário(a)", recepcao: "Recepção" };
const TIPO_COLORS = { admin: "#7C3AED", psicologo: "#4B6CB7", estagiario: "#D97706", recepcao: "#0891B2" };

// ── SHARED COMPONENTS ────────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const c = STATUS_COLORS[status] || { bg: "#F1F5F9", text: "#475569", label: status };
  return <span style={{ background: c.bg, color: c.text, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>{c.label}</span>;
};

const Card = ({ children, style = {} }) => (
  <div style={{ background: theme.surface, borderRadius: 12, border: `1px solid ${theme.border}`, padding: "20px 24px", ...style }}>{children}</div>
);

const Btn = ({ onClick, variant = "primary", children, small = false, disabled = false, style = {} }) => {
  const styles = {
    primary: { background: theme.primary, color: "#fff", border: "none" },
    ghost: { background: "transparent", color: theme.textMuted, border: `1px solid ${theme.border}` },
    danger: { background: theme.danger, color: "#fff", border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...styles[variant], borderRadius: 8, padding: small ? "5px 12px" : "8px 18px", fontSize: small ? 13 : 14, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .6 : 1, display: "inline-flex", alignItems: "center", gap: 6, ...style }}>
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, type = "text", placeholder = "", required = false }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: theme.textMuted, marginBottom: 4 }}>{label}{required && " *"}</label>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, fontSize: 14, color: theme.text, outline: "none", boxSizing: "border-box", background: "#FAFBFD" }} />
  </div>
);

const SelectInput = ({ label, value, onChange, options, required = false }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: theme.textMuted, marginBottom: 4 }}>{label}{required && " *"}</label>}
    <select value={value} onChange={onChange} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, fontSize: 14, color: theme.text, background: "#FAFBFD", outline: "none" }}>
      <option value="">Selecione...</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
    <div style={{ background: theme.surface, borderRadius: 14, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: `1px solid ${theme.border}` }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: theme.text }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: 20 }}>✕</button>
      </div>
      <div style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  </div>
);

const TableHead = ({ cols }) => (
  <thead><tr style={{ background: theme.bg }}>
    {cols.map((c, i) => <th key={i} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", letterSpacing: ".04em", borderBottom: `1px solid ${theme.border}`, whiteSpace: "nowrap" }}>{c}</th>)}
  </tr></thead>
);

const Td = ({ children, muted = false }) => (
  <td style={{ padding: "12px 14px", fontSize: 14, color: muted ? theme.textMuted : theme.text, borderBottom: `1px solid ${theme.border}` }}>{children}</td>
);

const Spinner = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
    <div style={{ width: 32, height: 32, border: `3px solid ${theme.border}`, borderTop: `3px solid ${theme.primary}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const Erro = ({ msg, onRetry }) => (
  <div style={{ background: "#FFF5F5", border: "1px solid #FCA5A5", borderRadius: 10, padding: 20, textAlign: "center" }}>
    <div style={{ color: theme.danger, fontWeight: 500, marginBottom: 8 }}>⚠️ {msg}</div>
    {onRetry && <Btn small variant="ghost" onClick={onRetry}>Tentar novamente</Btn>}
  </div>
);

function useData(fetchFn) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const load = useCallback(async () => {
    setLoading(true); setErro(null);
    try { setData(await fetchFn()); }
    catch (e) { setErro(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { data, setData, loading, erro, reload: load };
}

// ── LOGIN — MODELO 3 (fundo escuro) ──────────────────────────────────────────
const PERFIS = [
  { tipo: "admin",      label: "Admin",      icon: "🛡️" },
  { tipo: "psicologo",  label: "Psicólogo",  icon: "🩺" },
  { tipo: "estagiario", label: "Estagiário", icon: "🎓" },
];

const LoginView = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [perfilSel, setPerfilSel] = useState("admin");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !senha) { setErro("Preencha email e senha."); return; }
    setLoading(true); setErro("");
    try {
      const res = await api.login(email, senha);
      if (res.ok) onLogin(res.user);
      else setErro(res.msg);
    } catch {
      setErro("Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
    } finally { setLoading(false); }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleLogin(); };

  return (
    <div style={{
      minHeight: "100vh", background: "#0F2447",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, position: "relative", overflow: "hidden",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Decoração de fundo */}
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", border: "60px solid rgba(255,255,255,.03)", top: -120, right: -100, pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 260, height: 260, borderRadius: "50%", border: "40px solid rgba(255,255,255,.03)", bottom: -80, left: -60, pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 160, height: 160, borderRadius: "50%", border: "25px solid rgba(255,255,255,.03)", top: "40%", left: "15%", pointerEvents: "none" }} />

      <div style={{
        background: "rgba(255,255,255,.06)",
        border: "1px solid rgba(255,255,255,.1)",
        borderRadius: 20, padding: "44px 40px",
        width: "100%", maxWidth: 400,
        position: "relative", zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, background: "rgba(255,255,255,.1)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 26 }}>🧠</div>
          <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0 }}>Clínica Vida +</h1>
          <p style={{ color: "rgba(255,255,255,.4)", fontSize: 13, margin: "4px 0 0" }}>Sistema de Gestão</p>
        </div>

        {/* Seleção de perfil */}
        <div style={{ marginBottom: 22 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Perfil de acesso</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {PERFIS.map(p => (
              <button key={p.tipo} onClick={() => setPerfilSel(p.tipo)} style={{
                padding: "10px 6px", borderRadius: 10, cursor: "pointer", textAlign: "center",
                border: perfilSel === p.tipo ? "1.5px solid rgba(255,255,255,.5)" : "1px solid rgba(255,255,255,.1)",
                background: perfilSel === p.tipo ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.04)",
                transition: "all .15s",
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{p.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: perfilSel === p.tipo ? "#fff" : "rgba(255,255,255,.45)" }}>{p.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div style={{ background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#FCA5A5" }}>
            {erro}
          </div>
        )}

        {/* Email */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Email</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "rgba(255,255,255,.3)" }}>✉</span>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKey}
              placeholder="seu@email.com"
              style={{ width: "100%", padding: "11px 12px 11px 38px", borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.07)", fontSize: 14, color: "#fff", outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>

        {/* Senha */}
        <div style={{ marginBottom: 22 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Senha</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "rgba(255,255,255,.3)" }}>🔒</span>
            <input
              type={showPw ? "text" : "password"} value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={handleKey}
              placeholder="••••••••"
              style={{ width: "100%", padding: "11px 40px 11px 38px", borderRadius: 8, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.07)", fontSize: 14, color: "#fff", outline: "none", boxSizing: "border-box" }}
            />
            <button onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 15, color: "rgba(255,255,255,.3)", padding: 0 }}>
              {showPw ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        {/* Botão entrar */}
        <button onClick={handleLogin} disabled={loading} style={{
          width: "100%", padding: "13px", borderRadius: 10,
          border: "1px solid rgba(255,255,255,.2)",
          background: "rgba(255,255,255,.1)",
          color: "#fff", fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          transition: "background .15s", opacity: loading ? .7 : 1,
        }}
          onMouseOver={e => { if (!loading) e.currentTarget.style.background = "rgba(255,255,255,.18)"; }}
          onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,.1)"}
        >
          {loading ? "Entrando..." : <>Entrar →</>}
        </button>

        <p style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: "rgba(255,255,255,.25)" }}>
          © 2025 PsiClínica · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
const DashboardHome = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.dashboard().then(setStats).finally(() => setLoading(false)); }, []);
  if (loading) return <Spinner />;
  if (!stats) return <Erro msg="Erro ao carregar dashboard" />;
  const StatCard = ({ label, value, emoji, color }) => (
    <div style={{ background: theme.surface, borderRadius: 12, border: `1px solid ${theme.border}`, padding: 20, display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{emoji}</div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: theme.text, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Olá, {user.nome.split(" ")[0]} 👋</h2>
        <p style={{ margin: "4px 0 0", color: theme.textMuted, fontSize: 14 }}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard label="Pacientes" value={stats.total_pacientes} emoji="👥" color={theme.primary} />
        <StatCard label="Agendadas" value={stats.agendadas} emoji="📅" color="#7C9E6B" />
        <StatCard label="Realizadas" value={stats.realizadas} emoji="✅" color="#D97706" />
        <StatCard label="Psicólogos" value={stats.total_psicologos} emoji="🩺" color="#7C3AED" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: theme.text }}>Próximas consultas</h3>
          {stats.proximas_consultas.length === 0 && <p style={{ color: theme.textMuted, fontSize: 14 }}>Nenhuma consulta agendada.</p>}
          {stats.proximas_consultas.map(c => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${theme.border}` }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{c.paciente_nome}</div>
                <div style={{ fontSize: 12, color: theme.textMuted }}>{c.psicologo_nome} · {c.hora}</div>
              </div>
              <div style={{ fontSize: 12, color: theme.primary, fontWeight: 500 }}>{new Date(c.data + "T12:00:00").toLocaleDateString("pt-BR")}</div>
            </div>
          ))}
        </Card>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: theme.text }}>Últimos pacientes</h3>
          {stats.ultimos_pacientes.map(p => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${theme.border}` }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: theme.primaryLight, color: theme.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                {p.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{p.nome}</div>
                <div style={{ fontSize: 12, color: theme.textMuted }}>{p.telefone || p.email || "—"}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

// ── PACIENTES ─────────────────────────────────────────────────────────────────
const PacientesView = ({ canEdit }) => {
  const { data, loading, erro, reload } = useData(api.listarPacientes);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const filtered = data.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()) || (p.cpf || "").includes(search));
  const openNovo = () => { setForm({ nome: "", cpf: "", telefone: "", email: "", data_nascimento: "", observacoes: "" }); setModal("novo"); };
  const openEditar = (p) => { setForm({ ...p }); setModal("edit"); };
  const salvar = async () => {
    if (!form.nome) return;
    setSaving(true);
    try {
      if (modal === "novo") await api.criarPaciente(form);
      else await api.atualizarPaciente(form.id, form);
      await reload(); setModal(null);
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };
  const excluir = async (id) => {
    if (!window.confirm("Excluir paciente?")) return;
    try { await api.deletarPaciente(id); await reload(); } catch (e) { alert(e.message); }
  };
  const f = (k) => ({ value: form[k] || "", onChange: e => setForm(x => ({ ...x, [k]: e.target.value })) });
  if (loading) return <Spinner />;
  if (erro) return <Erro msg={erro} onRetry={reload} />;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Pacientes <span style={{ fontSize: 14, fontWeight: 400, color: theme.textMuted }}>({data.length})</span></h2>
        {canEdit && <Btn onClick={openNovo}>+ Novo paciente</Btn>}
      </div>
      <Card style={{ marginBottom: 16, padding: "12px 16px" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍  Buscar por nome ou CPF..."
          style={{ border: "none", outline: "none", fontSize: 14, color: theme.text, width: "100%", background: "transparent" }} />
      </Card>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <TableHead cols={["Nome", "CPF", "Telefone", "Email", "Nascimento", "Cadastrado em", ""]} />
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <Td><strong style={{ fontWeight: 500 }}>{p.nome}</strong></Td>
                <Td muted>{p.cpf || "—"}</Td><Td muted>{p.telefone || "—"}</Td><Td muted>{p.email || "—"}</Td>
                <Td muted>{p.data_nascimento ? new Date(p.data_nascimento + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</Td>
                <Td muted>{p.criado_em ? new Date(p.criado_em).toLocaleDateString("pt-BR") : "—"}</Td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {canEdit && <Btn small variant="ghost" onClick={() => openEditar(p)}>✏️</Btn>}
                    {canEdit && <Btn small variant="danger" onClick={() => excluir(p.id)}>🗑</Btn>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p style={{ textAlign: "center", color: theme.textMuted, padding: 32, fontSize: 14 }}>Nenhum paciente encontrado.</p>}
      </Card>
      {modal && (
        <Modal title={modal === "novo" ? "Novo paciente" : "Editar paciente"} onClose={() => setModal(null)}>
          <Input label="Nome completo" required {...f("nome")} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="CPF" {...f("cpf")} placeholder="000.000.000-00" />
            <Input label="Telefone" {...f("telefone")} placeholder="(11) 99999-9999" />
          </div>
          <Input label="Email" type="email" {...f("email")} />
          <Input label="Data de nascimento" type="date" {...f("data_nascimento")} />
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: theme.textMuted, marginBottom: 4 }}>Observações</label>
            <textarea value={form.observacoes || ""} onChange={e => setForm(x => ({ ...x, observacoes: e.target.value }))} rows={3}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", background: "#FAFBFD" }} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── CONSULTAS ─────────────────────────────────────────────────────────────────
const ConsultasView = ({ canEdit }) => {
  const { data: consultas, loading, erro, reload } = useData(api.listarConsultas);
  const { data: pacientes } = useData(api.listarPacientes);
  const { data: psicologos } = useData(api.listarPsicologos);
  const [filterStatus, setFilterStatus] = useState("todos");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ paciente_id: "", psicologo_id: "", data: "", hora: "09:00", status: "agendada", observacoes: "" });
  const [saving, setSaving] = useState(false);
  const filtered = consultas.filter(c => filterStatus === "todos" || c.status === filterStatus).sort((a, b) => a.data > b.data ? -1 : 1);
  const agendar = async () => {
    if (!form.paciente_id || !form.psicologo_id || !form.data) return;
    setSaving(true);
    try { await api.criarConsulta(form); await reload(); setModal(false); }
    catch (e) { alert(e.message); } finally { setSaving(false); }
  };
  const mudarStatus = async (id, status) => {
    try { await api.mudarStatusConsulta(id, status); await reload(); } catch (e) { alert(e.message); }
  };
  const f = (k) => ({ value: form[k], onChange: e => setForm(x => ({ ...x, [k]: e.target.value })) });
  if (loading) return <Spinner />;
  if (erro) return <Erro msg={erro} onRetry={reload} />;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Consultas</h2>
        {canEdit && <Btn onClick={() => setModal(true)}>+ Agendar consulta</Btn>}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["todos", "agendada", "realizada", "cancelada"].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: "pointer", border: `1px solid ${filterStatus === s ? theme.primary : theme.border}`, background: filterStatus === s ? theme.primaryLight : "transparent", color: filterStatus === s ? theme.primary : theme.textMuted }}>
            {s === "todos" ? "Todos" : STATUS_COLORS[s]?.label}
          </button>
        ))}
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <TableHead cols={["Paciente", "Psicólogo(a)", "Data", "Hora", "Status", ""]} />
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <Td><strong style={{ fontWeight: 500 }}>{c.paciente_nome || "—"}</strong></Td>
                <Td muted>{c.psicologo_nome || "—"}</Td>
                <Td muted>{c.data ? new Date(c.data + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</Td>
                <Td muted>{c.hora}</Td>
                <Td><Badge status={c.status} /></Td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${theme.border}` }}>
                  {canEdit && c.status === "agendada" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn small onClick={() => mudarStatus(c.id, "realizada")} style={{ background: "#F0FFF4", color: "#15803D", border: "none", fontSize: 12 }}>✓ Realizada</Btn>
                      <Btn small variant="danger" onClick={() => mudarStatus(c.id, "cancelada")} style={{ fontSize: 12 }}>Cancelar</Btn>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p style={{ textAlign: "center", color: theme.textMuted, padding: 32, fontSize: 14 }}>Nenhuma consulta encontrada.</p>}
      </Card>
      {modal && (
        <Modal title="Agendar consulta" onClose={() => setModal(false)}>
          <SelectInput label="Paciente" required {...f("paciente_id")} options={pacientes.map(p => ({ value: p.id, label: p.nome }))} />
          <SelectInput label="Psicólogo(a)" required {...f("psicologo_id")} options={psicologos.map(p => ({ value: p.id, label: p.nome }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="Data" type="date" required {...f("data")} />
            <Input label="Hora" type="time" required {...f("hora")} />
          </div>
          <SelectInput label="Status" {...f("status")} options={[{ value: "agendada", label: "Agendada" }, { value: "realizada", label: "Realizada" }, { value: "cancelada", label: "Cancelada" }]} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={agendar} disabled={saving}>{saving ? "Salvando..." : "Agendar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── PRONTUÁRIOS ───────────────────────────────────────────────────────────────
const ProntuariosView = ({ canEdit }) => {
  const { data, loading, erro, reload } = useData(api.listarProntuarios);
  const { data: consultas } = useData(api.listarConsultas);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const salvar = async () => {
    if (!form.consulta_id || !form.diagnostico) return;
    setSaving(true);
    try {
      if (form.id) await api.atualizarProntuario(form.id, form);
      else await api.criarProntuario(form);
      await reload(); setModal(null);
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };
  const f = (k) => ({ value: form[k] || "", onChange: e => setForm(x => ({ ...x, [k]: e.target.value })) });
  const consultasRealizadas = consultas.filter(c => c.status === "realizada");
  if (loading) return <Spinner />;
  if (erro) return <Erro msg={erro} onRetry={reload} />;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Prontuários</h2>
        {canEdit && <Btn onClick={() => { setForm({ consulta_id: "", diagnostico: "", prescricao: "", observacoes: "" }); setModal("novo"); }}>+ Novo prontuário</Btn>}
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {data.map(pr => (
          <Card key={pr.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: theme.primaryLight, color: theme.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                    {(pr.paciente_nome || "??").split(" ").map(n => n[0]).slice(0, 2).join("")}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: theme.text }}>{pr.paciente_nome}</div>
                    <div style={{ fontSize: 12, color: theme.textMuted }}>{pr.psicologo_nome} · {pr.consulta_data ? new Date(pr.consulta_data + "T12:00:00").toLocaleDateString("pt-BR") : ""}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", marginBottom: 3 }}>Diagnóstico</div>
                    <div style={{ fontSize: 14, color: theme.text }}>{pr.diagnostico}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, textTransform: "uppercase", marginBottom: 3 }}>Prescrição</div>
                    <div style={{ fontSize: 14, color: theme.text }}>{pr.prescricao || "—"}</div>
                  </div>
                </div>
                {pr.observacoes && <div style={{ marginTop: 8, fontSize: 13, color: theme.textMuted }}>{pr.observacoes}</div>}
              </div>
              {canEdit && <Btn small variant="ghost" onClick={() => { setForm({ ...pr }); setModal("edit"); }} style={{ marginLeft: 12 }}>✏️</Btn>}
            </div>
          </Card>
        ))}
        {data.length === 0 && <Card><p style={{ color: theme.textMuted, fontSize: 14, textAlign: "center", margin: 0 }}>Nenhum prontuário registrado.</p></Card>}
      </div>
      {modal && (
        <Modal title={form.id ? "Editar prontuário" : "Novo prontuário"} onClose={() => setModal(null)}>
          {!form.id && <SelectInput label="Consulta realizada" required {...f("consulta_id")} options={consultasRealizadas.map(c => ({ value: c.id, label: `${c.paciente_nome} — ${new Date(c.data + "T12:00:00").toLocaleDateString("pt-BR")}` }))} />}
          <Input label="Diagnóstico" required {...f("diagnostico")} />
          <Input label="Prescrição / Encaminhamento" {...f("prescricao")} />
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: theme.textMuted, marginBottom: 4 }}>Observações clínicas</label>
            <textarea value={form.observacoes || ""} onChange={e => setForm(x => ({ ...x, observacoes: e.target.value }))} rows={4}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", background: "#FAFBFD" }} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── PSICÓLOGOS ────────────────────────────────────────────────────────────────
const PsicologosView = ({ canEdit }) => {
  const { data, loading, erro, reload } = useData(api.listarPsicologos);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const salvar = async () => {
    if (!form.nome) return; setSaving(true);
    try {
      if (form.id) await api.atualizarPsicologo(form.id, form);
      else await api.criarPsicologo(form);
      await reload(); setModal(null);
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };
  const excluir = async (id) => {
    if (!window.confirm("Excluir?")) return;
    try { await api.deletarPsicologo(id); await reload(); } catch (e) { alert(e.message); }
  };
  const f = (k) => ({ value: form[k] || "", onChange: e => setForm(x => ({ ...x, [k]: e.target.value })) });
  if (loading) return <Spinner />;
  if (erro) return <Erro msg={erro} onRetry={reload} />;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Psicólogos</h2>
        {canEdit && <Btn onClick={() => { setForm({ nome: "", crp: "", especialidade: "", telefone: "", email: "" }); setModal("novo"); }}>+ Novo psicólogo</Btn>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {data.map(p => (
          <Card key={p.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#F3E8FF", color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                  {p.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: theme.text }}>{p.nome}</div>
                  <div style={{ fontSize: 12, color: "#7C3AED", fontWeight: 500 }}>{p.especialidade}</div>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 3 }}>{p.crp}</div>
                  <div style={{ fontSize: 12, color: theme.textMuted }}>{p.email}</div>
                </div>
              </div>
              {canEdit && <div style={{ display: "flex", gap: 6 }}>
                <Btn small variant="ghost" onClick={() => { setForm({ ...p }); setModal("edit"); }}>✏️</Btn>
                <Btn small variant="danger" onClick={() => excluir(p.id)}>🗑</Btn>
              </div>}
            </div>
          </Card>
        ))}
      </div>
      {modal && (
        <Modal title={form.id ? "Editar psicólogo" : "Novo psicólogo"} onClose={() => setModal(null)}>
          <Input label="Nome completo" required {...f("nome")} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="CRP" {...f("crp")} placeholder="CRP 06/XXXXX" />
            <Input label="Especialidade" {...f("especialidade")} />
          </div>
          <Input label="Telefone" {...f("telefone")} />
          <Input label="Email" type="email" {...f("email")} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── ESTAGIÁRIOS ───────────────────────────────────────────────────────────────
const EstagiariosView = ({ canEdit }) => {
  const { data, loading, erro, reload } = useData(api.listarEstagiarios);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const salvar = async () => {
    if (!form.nome) return; setSaving(true);
    try {
      if (form.id) await api.atualizarEstagiario(form.id, form);
      else await api.criarEstagiario(form);
      await reload(); setModal(null);
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };
  const excluir = async (id) => {
    if (!window.confirm("Excluir?")) return;
    try { await api.deletarEstagiario(id); await reload(); } catch (e) { alert(e.message); }
  };
  const f = (k) => ({ value: form[k] || "", onChange: e => setForm(x => ({ ...x, [k]: e.target.value })) });
  if (loading) return <Spinner />;
  if (erro) return <Erro msg={erro} onRetry={reload} />;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Estagiários</h2>
        {canEdit && <Btn onClick={() => { setForm({ nome: "", cpf: "", telefone: "", email: "", curso: "", instituicao: "", data_inicio: "", data_fim: "", carga_horaria: "", bolsa: "" }); setModal("novo"); }}>+ Novo estagiário</Btn>}
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <TableHead cols={["Nome", "Curso / Instituição", "Período", "Carga h.", "Bolsa", ""]} />
          <tbody>
            {data.map(e => (
              <tr key={e.id}>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ fontWeight: 500, fontSize: 14, color: theme.text }}>{e.nome}</div>
                  <div style={{ fontSize: 12, color: theme.textMuted }}>{e.email}</div>
                </td>
                <Td muted>{e.curso}{e.instituicao ? ` · ${e.instituicao}` : ""}</Td>
                <Td muted>{e.data_inicio && e.data_fim ? `${new Date(e.data_inicio + "T12:00:00").toLocaleDateString("pt-BR")} – ${new Date(e.data_fim + "T12:00:00").toLocaleDateString("pt-BR")}` : "—"}</Td>
                <Td muted>{e.carga_horaria ? `${e.carga_horaria}h/sem` : "—"}</Td>
                <Td muted>{e.bolsa ? `R$ ${Number(e.bolsa).toLocaleString("pt-BR")}` : "—"}</Td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${theme.border}` }}>
                  {canEdit && <div style={{ display: "flex", gap: 6 }}>
                    <Btn small variant="ghost" onClick={() => { setForm({ ...e }); setModal("edit"); }}>✏️</Btn>
                    <Btn small variant="danger" onClick={() => excluir(e.id)}>🗑</Btn>
                  </div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <p style={{ textAlign: "center", color: theme.textMuted, padding: 32, fontSize: 14 }}>Nenhum estagiário cadastrado.</p>}
      </Card>
      {modal && (
        <Modal title={form.id ? "Editar estagiário" : "Novo estagiário"} onClose={() => setModal(null)}>
          <Input label="Nome completo" required {...f("nome")} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="CPF" {...f("cpf")} /><Input label="Telefone" {...f("telefone")} />
          </div>
          <Input label="Email" type="email" {...f("email")} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="Curso" {...f("curso")} /><Input label="Instituição" {...f("instituicao")} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="Início" type="date" {...f("data_inicio")} /><Input label="Fim" type="date" {...f("data_fim")} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input label="Carga h./sem" type="number" {...f("carga_horaria")} /><Input label="Bolsa (R$)" type="number" {...f("bolsa")} />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── USUÁRIOS ──────────────────────────────────────────────────────────────────
const UsuariosView = () => {
  const { data, loading, erro, reload } = useData(api.listarUsuarios);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const salvar = async () => {
    if (!form.nome || !form.email) return; setSaving(true);
    try {
      if (form.id) await api.atualizarUsuario(form.id, form);
      else await api.criarUsuario(form);
      await reload(); setModal(null);
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };
  const excluir = async (id) => {
    if (!window.confirm("Excluir usuário?")) return;
    try { await api.deletarUsuario(id); await reload(); } catch (e) { alert(e.message); }
  };
  const f = (k) => ({ value: form[k] || "", onChange: e => setForm(x => ({ ...x, [k]: e.target.value })) });
  if (loading) return <Spinner />;
  if (erro) return <Erro msg={erro} onRetry={reload} />;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Usuários do sistema</h2>
        <Btn onClick={() => { setForm({ nome: "", email: "", senha: "", tipo: "estagiario" }); setModal("novo"); }}>+ Novo usuário</Btn>
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <TableHead cols={["Nome", "Email", "Tipo", ""]} />
          <tbody>
            {data.map(u => (
              <tr key={u.id}>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: (TIPO_COLORS[u.tipo] || "#999") + "20", color: TIPO_COLORS[u.tipo] || "#999", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600 }}>
                      {u.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                    </div>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{u.nome}</span>
                  </div>
                </td>
                <Td muted>{u.email}</Td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${theme.border}` }}>
                  <span style={{ background: (TIPO_COLORS[u.tipo] || "#999") + "20", color: TIPO_COLORS[u.tipo] || "#999", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>
                    {TIPO_LABEL[u.tipo] || u.tipo}
                  </span>
                </td>
                <td style={{ padding: "12px 14px", borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn small variant="ghost" onClick={() => { setForm({ ...u, senha: "" }); setModal("edit"); }}>✏️</Btn>
                    <Btn small variant="danger" onClick={() => excluir(u.id)}>🗑</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {modal && (
        <Modal title={form.id ? "Editar usuário" : "Novo usuário"} onClose={() => setModal(null)}>
          <Input label="Nome completo" required {...f("nome")} />
          <Input label="Email" type="email" required {...f("email")} />
          <Input label={form.id ? "Nova senha (deixe em branco para manter)" : "Senha"} type="password" required={!form.id} {...f("senha")} />
          <SelectInput label="Tipo de acesso" required {...f("tipo")} options={[
            { value: "admin", label: "Administrador" },
            { value: "psicologo", label: "Psicólogo(a)" },
            { value: "estagiario", label: "Estagiário(a)" },
            { value: "recepcao", label: "Recepção" },
          ]} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "home",        label: "Início",      emoji: "🏠", roles: ["admin","psicologo","estagiario","recepcao"] },
  { key: "pacientes",   label: "Pacientes",   emoji: "👥", roles: ["admin","psicologo","estagiario","recepcao"] },
  { key: "consultas",   label: "Consultas",   emoji: "📅", roles: ["admin","psicologo","estagiario","recepcao"] },
  { key: "prontuarios", label: "Prontuários", emoji: "📋", roles: ["admin","psicologo"] },
  { key: "psicologos",  label: "Psicólogos",  emoji: "🩺", roles: ["admin","psicologo","estagiario"] },
  { key: "estagiarios", label: "Estagiários", emoji: "🎓", roles: ["admin"] },
  { key: "usuarios",    label: "Usuários",    emoji: "🔐", roles: ["admin"] },
];

const Sidebar = ({ user, current, onNav, onLogout, collapsed, onToggle }) => (
  <div style={{ width: collapsed ? 64 : 220, background: "#0F2447", display: "flex", flexDirection: "column", transition: "width .2s", overflow: "hidden", flexShrink: 0, minHeight: "100vh" }}>
    <div style={{ padding: collapsed ? "20px 12px" : "20px 16px", borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between" }}>
      {!collapsed && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, background: "rgba(255,255,255,.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧠</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Clínica Vida +</div>
            <div style={{ color: "rgba(255,255,255,.4)", fontSize: 10 }}>Sistema de Gestão</div>
          </div>
        </div>
      )}
      <button onClick={onToggle} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.5)", fontSize: 18 }}>☰</button>
    </div>
    <nav style={{ flex: 1, padding: "8px 0" }}>
      {NAV_ITEMS.filter(n => n.roles.includes(user.tipo)).map(item => {
        const active = current === item.key;
        return (
          <button key={item.key} onClick={() => onNav(item.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "10px 0" : "10px 16px", justifyContent: collapsed ? "center" : "flex-start", background: active ? "rgba(255,255,255,.1)" : "transparent", border: "none", cursor: "pointer", color: active ? "#fff" : "rgba(255,255,255,.5)", borderLeft: active ? "3px solid rgba(255,255,255,.7)" : "3px solid transparent", fontSize: 13, fontWeight: active ? 600 : 400 }}>
            <span style={{ fontSize: 16 }}>{item.emoji}</span>
            {!collapsed && item.label}
          </button>
        );
      })}
    </nav>
    <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", padding: collapsed ? "14px 0" : "14px 16px" }}>
      {!collapsed && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{user.nome}</div>
          <div style={{ color: "rgba(255,255,255,.4)", fontSize: 11 }}>{TIPO_LABEL[user.tipo]}</div>
        </div>
      )}
      <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.5)", fontSize: 13, justifyContent: collapsed ? "center" : "flex-start", width: "100%" }}>
        <span>🚪</span>{!collapsed && "Sair"}
      </button>
    </div>
  </div>
);

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("home");
  const [collapsed, setCollapsed] = useState(false);
  const canEdit = user?.tipo === "admin" || user?.tipo === "psicologo" || user?.tipo === "estagiario";

  if (!user) return <LoginView onLogin={(u) => { setUser(u); setView("home"); }} />;

  const renderView = () => {
    switch (view) {
      case "home":        return <DashboardHome user={user} />;
      case "pacientes":   return <PacientesView canEdit={canEdit} />;
      case "consultas":   return <ConsultasView canEdit={canEdit} />;
      case "prontuarios": return <ProntuariosView canEdit={canEdit} />;
      case "psicologos":  return <PsicologosView canEdit={user?.tipo === "admin"} />;
      case "estagiarios": return <EstagiariosView canEdit={user?.tipo === "admin"} />;
      case "usuarios":    return user?.tipo === "admin" ? <UsuariosView /> : <p style={{ color: theme.danger, padding: 20 }}>Acesso negado.</p>;
      default: return null;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", background: theme.bg }}>
      <Sidebar user={user} current={view} onNav={setView} onLogout={() => setUser(null)} collapsed={collapsed} onToggle={() => setCollapsed(x => !x)} />
      <main style={{ flex: 1, padding: 28, overflow: "auto" }}>{renderView()}</main>
    </div>
  );
}