const BASE = "http://localhost:5000/api";

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || "Erro na requisição");
  return data;
}

export const api = {
  // Auth
  login: (email, senha) => req("POST", "/login", { email, senha }),

  // Dashboard
  dashboard: () => req("GET", "/dashboard"),

  // Usuários
  listarUsuarios: () => req("GET", "/usuarios"),
  criarUsuario: (d) => req("POST", "/usuarios", d),
  atualizarUsuario: (id, d) => req("PUT", `/usuarios/${id}`, d),
  deletarUsuario: (id) => req("DELETE", `/usuarios/${id}`),

  // Pacientes
  listarPacientes: () => req("GET", "/pacientes"),
  criarPaciente: (d) => req("POST", "/pacientes", d),
  atualizarPaciente: (id, d) => req("PUT", `/pacientes/${id}`, d),
  deletarPaciente: (id) => req("DELETE", `/pacientes/${id}`),

  // Psicólogos
  listarPsicologos: () => req("GET", "/psicologos"),
  criarPsicologo: (d) => req("POST", "/psicologos", d),
  atualizarPsicologo: (id, d) => req("PUT", `/psicologos/${id}`, d),
  deletarPsicologo: (id) => req("DELETE", `/psicologos/${id}`),

  // Estagiários
  listarEstagiarios: () => req("GET", "/estagiarios"),
  criarEstagiario: (d) => req("POST", "/estagiarios", d),
  atualizarEstagiario: (id, d) => req("PUT", `/estagiarios/${id}`, d),
  deletarEstagiario: (id) => req("DELETE", `/estagiarios/${id}`),

  // Consultas
  listarConsultas: () => req("GET", "/consultas"),
  criarConsulta: (d) => req("POST", "/consultas", d),
  atualizarConsulta: (id, d) => req("PUT", `/consultas/${id}`, d),
  mudarStatusConsulta: (id, status) => req("PATCH", `/consultas/${id}/status`, { status }),
  deletarConsulta: (id) => req("DELETE", `/consultas/${id}`),

  // Prontuários
  listarProntuarios: () => req("GET", "/prontuarios"),
  criarProntuario: (d) => req("POST", "/prontuarios", d),
  atualizarProntuario: (id, d) => req("PUT", `/prontuarios/${id}`, d),
};
