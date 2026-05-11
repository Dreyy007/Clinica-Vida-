const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
};

async function query(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function insert(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...headers, "Prefer": "return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function update(table, id, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...headers, "Prefer": "return=representation" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function remove(table, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error(await res.text());
  return true;
}

// SHA-256 no browser
async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export const api = {
  // AUTH
  login: async (email, senha) => {
    const hash = await sha256(senha);
    const rows = await query("usuarios", `?email=eq.${encodeURIComponent(email)}&senha=eq.${hash}&select=id,nome,email,tipo`);
    if (rows.length === 0) throw new Error("Email ou senha inválidos");
    return rows[0];
  },

  // DASHBOARD
  dashboard: async () => {
    const [pacientes, psicologos, consultas] = await Promise.all([
      query("pacientes", "?select=id,nome,telefone,email,criado_em&order=criado_em.desc&limit=5"),
      query("psicologos", "?select=id"),
      query("consultas", "?select=id,status,data,hora,paciente_id,psicologo_id&order=data.asc"),
    ]);
    const todosPacientes = await query("pacientes", "?select=id");
    const agendadas = consultas.filter(c => c.status === "agendada");
    const realizadas = consultas.filter(c => c.status === "realizada");

    const pacIds = [...new Set(agendadas.map(c => c.paciente_id))];
    const psiIds = [...new Set(agendadas.map(c => c.psicologo_id))];
    const [pacNomes, psiNomes] = await Promise.all([
      pacIds.length ? query("pacientes", `?id=in.(${pacIds.join(",")})&select=id,nome`) : [],
      psiIds.length ? query("psicologos", `?id=in.(${psiIds.join(",")})&select=id,nome`) : [],
    ]);

    const proximas = agendadas.slice(0, 5).map(c => ({
      ...c,
      paciente_nome: pacNomes.find(p => p.id === c.paciente_id)?.nome || "—",
      psicologo_nome: psiNomes.find(p => p.id === c.psicologo_id)?.nome || "—",
    }));

    return {
      total_pacientes: todosPacientes.length,
      total_psicologos: psicologos.length,
      agendadas: agendadas.length,
      realizadas: realizadas.length,
      proximas_consultas: proximas,
      ultimos_pacientes: pacientes,
    };
  },

  // USUÁRIOS
  listarUsuarios: () => query("usuarios", "?select=id,nome,email,tipo&order=nome"),
  criarUsuario: async (d) => {
    const hash = await sha256(d.senha);
    return insert("usuarios", { ...d, senha: hash });
  },
  atualizarUsuario: async (id, d) => {
    const body = { nome: d.nome, email: d.email, tipo: d.tipo };
    if (d.senha) body.senha = await sha256(d.senha);
    return update("usuarios", id, body);
  },
  deletarUsuario: (id) => remove("usuarios", id),

  // PACIENTES
  listarPacientes: () => query("pacientes", "?order=criado_em.desc"),
  criarPaciente: (d) => insert("pacientes", d),
  atualizarPaciente: (id, d) => update("pacientes", id, d),
  deletarPaciente: (id) => remove("pacientes", id),

  // PSICÓLOGOS
  listarPsicologos: () => query("psicologos", "?order=nome"),
  criarPsicologo: (d) => insert("psicologos", d),
  atualizarPsicologo: (id, d) => update("psicologos", id, d),
  deletarPsicologo: (id) => remove("psicologos", id),

  // ESTAGIÁRIOS
  listarEstagiarios: () => query("estagiarios", "?order=nome"),
  criarEstagiario: (d) => insert("estagiarios", d),
  atualizarEstagiario: (id, d) => update("estagiarios", id, d),
  deletarEstagiario: (id) => remove("estagiarios", id),

  // CONSULTAS
  listarConsultas: async () => {
    const consultas = await query("consultas", "?order=data.desc,hora.desc");
    if (!consultas.length) return [];
    const pacIds = [...new Set(consultas.map(c => c.paciente_id).filter(Boolean))];
    const psiIds = [...new Set(consultas.map(c => c.psicologo_id).filter(Boolean))];
    const [pacs, psis] = await Promise.all([
      pacIds.length ? query("pacientes", `?id=in.(${pacIds.join(",")})&select=id,nome`) : [],
      psiIds.length ? query("psicologos", `?id=in.(${psiIds.join(",")})&select=id,nome`) : [],
    ]);
    return consultas.map(c => ({
      ...c,
      paciente_nome: pacs.find(p => p.id === c.paciente_id)?.nome || "—",
      psicologo_nome: psis.find(p => p.id === c.psicologo_id)?.nome || "—",
    }));
  },
  criarConsulta: (d) => insert("consultas", d),
  atualizarConsulta: (id, d) => update("consultas", id, d),
  mudarStatusConsulta: (id, status) => update("consultas", id, { status }),
  deletarConsulta: (id) => remove("consultas", id),

  // PRONTUÁRIOS
  listarProntuarios: async () => {
    const prontuarios = await query("prontuarios", "?order=criado_em.desc");
    if (!prontuarios.length) return [];
    const consIds = [...new Set(prontuarios.map(p => p.consulta_id).filter(Boolean))];
    const consultas = consIds.length ? await query("consultas", `?id=in.(${consIds.join(",")})&select=id,data,hora,paciente_id,psicologo_id`) : [];
    const pacIds = [...new Set(consultas.map(c => c.paciente_id).filter(Boolean))];
    const psiIds = [...new Set(consultas.map(c => c.psicologo_id).filter(Boolean))];
    const [pacs, psis] = await Promise.all([
      pacIds.length ? query("pacientes", `?id=in.(${pacIds.join(",")})&select=id,nome`) : [],
      psiIds.length ? query("psicologos", `?id=in.(${psiIds.join(",")})&select=id,nome`) : [],
    ]);
    return prontuarios.map(pr => {
      const c = consultas.find(x => x.id === pr.consulta_id);
      return {
        ...pr,
        consulta_data: c?.data,
        paciente_nome: pacs.find(p => p.id === c?.paciente_id)?.nome || "—",
        psicologo_nome: psis.find(p => p.id === c?.psicologo_id)?.nome || "—",
      };
    });
  },
  criarProntuario: (d) => insert("prontuarios", d),
  atualizarProntuario: (id, d) => update("prontuarios", id, d),
};