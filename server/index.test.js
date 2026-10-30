import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import { criarServidor } from "./index.js";

async function iniciar(teste, opcoes = {}) {
    const servidor = criarServidor({ chave: "chave-ficticia-de-teste", ...opcoes });
    servidor.listen(0, "127.0.0.1");
    await once(servidor, "listening");
    teste.after(() => new Promise((resolve) => servidor.close(resolve)));
    return `http://127.0.0.1:${servidor.address().port}`;
}

test("consulta leagues com o cabeçalho correto, sem devolver a chave", async (t) => {
    const endereco = await iniciar(t, {
        consultar: async (url, opcoes) => {
            assert.equal(url, "https://v1.basketball.api-sports.io/leagues");
            assert.equal(opcoes.headers["x-apisports-key"], "chave-ficticia-de-teste");
            assert.equal(opcoes.redirect, "error");
            return Response.json({ errors: [], results: 1, response: [{ id: 12, name: "NBA" }] });
        },
    });
    const resposta = await fetch(endereco + "/api/ligas");
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), { results: 1, response: [{ id: 12, name: "NBA" }] });
    assert.equal(resposta.headers.get("x-apisports-key"), null);
});

test("converte os filtros para os parâmetros da API de jogos", async (t) => {
    const endereco = await iniciar(t, {
        consultar: async (caminho) => {
            const url = new URL(caminho);
            assert.equal(url.origin, "https://v1.basketball.api-sports.io");
            assert.equal(url.pathname, "/games");
            assert.equal(url.searchParams.get("league"), "12");
            assert.equal(url.searchParams.get("season"), "2025-2026");
            assert.equal(url.searchParams.get("date"), "2026-03-01");
            assert.equal(url.searchParams.get("timezone"), "America/Sao_Paulo");
            assert.equal(url.searchParams.has("url"), false);
            return Response.json({ errors: {}, results: 0, response: [] });
        },
    });
    const resposta = await fetch(endereco + "/api/jogos?liga=12&temporada=2025-2026&data=2026-03-01&url=https://example.com");
    assert.equal(resposta.status, 200);
    assert.deepEqual((await resposta.json()).response, []);
});

test("aceita consulta apenas por data ou por liga e temporada", async (t) => {
    const consultas = [];
    const endereco = await iniciar(t, {
        consultar: async (url) => {
            consultas.push(new URL(url));
            return Response.json({ errors: [], results: 0, response: [] });
        },
    });
    for (const filtro of ["data=2026-10-29", "liga=12&temporada=2025"] ) {
        assert.equal((await fetch(endereco + "/api/jogos?" + filtro)).status, 200);
    }
    assert.equal(consultas[0].searchParams.has("season"), false);
    assert.equal(consultas[1].searchParams.has("date"), false);
});

test("rejeita filtros inválidos antes de consumir a cota da API", async (t) => {
    const endereco = await iniciar(t, { consultar: () => assert.fail("Não deveria consultar a API") });
    for (const filtro of ["", "liga=12", "temporada=2025", "data=2026-02-30", "data=errada", "liga=-1&temporada=2025"]) {
        assert.equal((await fetch(endereco + "/api/jogos?" + filtro)).status, 400, filtro);
    }
});

test("informa chave ausente sem fazer consulta externa", async (t) => {
    const endereco = await iniciar(t, { chave: "", consultar: () => assert.fail("Não deveria consultar a API") });
    const resposta = await fetch(endereco + "/api/ligas");
    assert.equal(resposta.status, 503);
    assert.match((await resposta.json()).erro, /não foi configurada/);
});

test("trata a resposta Missing application key com HTTP 200", async (t) => {
    const endereco = await iniciar(t, {
        consultar: async () => Response.json({
            get: "", parameters: [],
            errors: { token: "Missing application key, Check our documentation on how to add your API key in headers.", error: "4xHe" },
            results: 0, paging: { current: 1, total: 1 }, response: [],
        }),
    });
    const resposta = await fetch(endereco + "/api/ligas");
    assert.equal(resposta.status, 502);
    assert.match((await resposta.json()).erro, /autenticação/);
});

test("distingue limites, plano, acesso negado e indisponibilidade", async (t) => {
    for (const [status, corpo, esperado] of [
        [200, { errors: { requests: "Limite atingido" } }, 429],
        [200, { errors: { plan: "Temporada indisponível" } }, 400],
        [401, {}, 502], [403, {}, 502], [429, {}, 429], [500, {}, 502],
    ]) {
        const endereco = await iniciar(t, { consultar: async () => Response.json(corpo, { status }) });
        assert.equal((await fetch(endereco + "/api/ligas")).status, esperado);
    }
});

test("informa em português as datas permitidas quando o plano restringe o período", async (t) => {
    const endereco = await iniciar(t, {
        consultar: async () => Response.json({
            errors: { plan: "Free plans do not have access to this date, try from 2026-10-29 to 2026-10-31." },
            response: [],
        }),
    });
    const resposta = await fetch(endereco + "/api/jogos?data=2024-03-01");
    assert.equal(resposta.status, 400);
    assert.equal((await resposta.json()).erro,
        "Seu plano permite consultar jogos entre 29/10/2026 e 31/10/2026. Escolha uma data nesse período.");
});

test("trata respostas inválidas, timeout e falha de rede sem expor detalhes", async (t) => {
    for (const [consultar, status] of [
        [async () => Response.json({ response: {} }), 502],
        [async () => new Response("<html>indisponível</html>"), 502],
        [async () => { throw new DOMException("detalhe interno", "TimeoutError"); }, 504],
        [async () => { throw new Error("detalhe interno"); }, 502],
    ]) {
        const endereco = await iniciar(t, { consultar });
        const resposta = await fetch(endereco + "/api/ligas");
        assert.equal(resposta.status, status);
        assert.doesNotMatch(await resposta.text(), /detalhe interno|chave-ficticia/);
    }
});

test("permite apenas as rotas e métodos definidos", async (t) => {
    const endereco = await iniciar(t, { consultar: () => assert.fail("Não deveria consultar a API") });
    assert.equal((await fetch(endereco + "/api/status")).status, 404);
    const resposta = await fetch(endereco + "/api/ligas", { method: "POST" });
    assert.equal(resposta.status, 405);
    assert.equal(resposta.headers.get("allow"), "GET");
});
