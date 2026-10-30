import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

const enderecoApi = "https://v1.basketball.api-sports.io";

function responder(resposta, status, dados) {
    resposta.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
    });
    resposta.end(JSON.stringify(dados));
}

function parametrosJogos(busca) {
    const liga = busca.get("liga") || "";
    const temporada = busca.get("temporada") || "";
    const data = busca.get("data") || "";

    if (liga && !/^[1-9]\d*$/.test(liga)) return null;
    if (temporada && !/^\d{4}(-\d{4})?$/.test(temporada)) return null;
    if (Boolean(liga) !== Boolean(temporada)) return null;
    if (!data && !liga) return null;
    if (data) {
        const valor = new Date(data + "T00:00:00Z");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(valor.getTime()) ||
            valor.toISOString().slice(0, 10) !== data) return null;
    }

    const parametros = new URLSearchParams({ timezone: "America/Sao_Paulo" });
    if (liga) parametros.set("league", liga);
    if (temporada) parametros.set("season", temporada);
    if (data) parametros.set("date", data);
    return parametros;
}

// A chave fica apenas no servidor. O navegador acessa nossas rotas /api.
export function criarServidor({ chave = process.env.API_SPORTS_KEY, consultar = fetch } = {}) {
    return createServer(async (requisicao, resposta) => {
        const url = new URL(requisicao.url, "http://localhost");

        if (!["/api/ligas", "/api/jogos"].includes(url.pathname)) {
            responder(resposta, 404, { erro: "Rota não encontrada." });
            return;
        }
        if (requisicao.method !== "GET") {
            resposta.setHeader("Allow", "GET");
            responder(resposta, 405, { erro: "Método não permitido." });
            return;
        }

        let caminho = "/leagues";
        if (url.pathname === "/api/jogos") {
            const parametros = parametrosJogos(url.searchParams);
            if (!parametros) {
                responder(resposta, 400, { erro: "Informe uma data válida ou uma liga com sua temporada." });
                return;
            }
            caminho = "/games?" + parametros.toString();
        }

        if (!chave?.trim()) {
            responder(resposta, 503, { erro: "A chave da API-Sports ainda não foi configurada no servidor." });
            return;
        }

        try {
            const resultado = await consultar(enderecoApi + caminho, {
                headers: { "x-apisports-key": chave.trim() },
                signal: AbortSignal.timeout(15000),
                redirect: "error",
            });

            if ([401, 403].includes(resultado.status)) {
                responder(resposta, 502, { erro: "A API-Sports recusou o acesso. Verifique a chave e as permissões do plano." });
                return;
            }
            if (resultado.status === 429) {
                responder(resposta, 429, { erro: "O limite de consultas da API-Sports foi atingido. Aguarde antes de tentar novamente." });
                return;
            }
            if (!resultado.ok) {
                responder(resposta, 502, { erro: "A API-Sports está indisponível. Tente novamente mais tarde." });
                return;
            }

            const dados = await resultado.json();
            // A API também retorna erros de autenticação com HTTP 200.
            if (dados.errors && Object.keys(dados.errors).length > 0) {
                const campos = Object.keys(dados.errors);
                if (campos.some((campo) => /token|key|auth/i.test(campo))) {
                    responder(resposta, 502, { erro: "A API-Sports recusou a autenticação. Verifique a chave configurada no servidor." });
                } else if (campos.some((campo) => /requests|rate|limit/i.test(campo))) {
                    responder(resposta, 429, { erro: "O limite de consultas da API-Sports foi atingido. Aguarde antes de tentar novamente." });
                } else {
                    const intervalo = String(dados.errors.plan ?? "")
                        .match(/try from (\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})/i);
                    const periodo = intervalo?.slice(1).map((data) => data.split("-").reverse().join("/"));
                    responder(resposta, 400, {
                        erro: periodo
                            ? `Seu plano permite consultar jogos entre ${periodo[0]} e ${periodo[1]}. Escolha uma data nesse período.`
                            : "A API-Sports recusou a consulta. Confira os filtros e as temporadas disponíveis no seu plano.",
                    });
                }
                return;
            }

            if (!Array.isArray(dados.response)) {
                responder(resposta, 502, { erro: "A API-Sports retornou um formato inesperado." });
                return;
            }

            // Enviamos apenas os dados da consulta, sem cabeçalhos de autenticação.
            responder(resposta, 200, { results: dados.results, response: dados.response });
        } catch (falha) {
            const expirou = ["TimeoutError", "AbortError"].includes(falha.name);
            responder(resposta, expirou ? 504 : 502, {
                erro: expirou
                    ? "A API-Sports demorou para responder. Tente novamente."
                    : "Não foi possível consultar a API-Sports. Verifique a conexão do servidor.",
            });
        }
    });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const servidor = criarServidor();
    servidor.on("error", () => {
        console.error("Não foi possível iniciar o servidor na porta 3001. Verifique se ela já está em uso.");
        process.exitCode = 1;
    });
    servidor.listen(3001, "127.0.0.1", () => {
        console.log("Servidor Basketball iniciado na porta 3001.");
    });
}
