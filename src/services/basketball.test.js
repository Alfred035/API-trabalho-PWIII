import assert from "node:assert/strict";
import { test } from "node:test";
import { buscarLigas, pesquisarJogos } from "./basketball.js";

test("organiza ligas e prioriza a temporada atual retornada pela API", async (t) => {
    t.mock.method(globalThis, "fetch", async (caminho) => {
        assert.equal(caminho, "/api/ligas");
        return Response.json({ response: [{
            id: 12, name: "NBA", country: { name: "USA" },
            seasons: [{ season: "2024-2025", current: true }, { season: "2025-2026", current: false }],
        }] });
    });
    const [liga] = await buscarLigas();
    assert.equal(liga.nome, "NBA");
    assert.equal(liga.temporadas[0].ano, "2024-2025");
    assert.equal(liga.pais, "USA");
});

test("envia filtros sem chave e preserva placar zero e placar não informado", async (t) => {
    t.mock.method(globalThis, "fetch", async (caminho, opcoes) => {
        const url = new URL(caminho, "http://localhost");
        assert.equal(url.searchParams.get("liga"), "12");
        assert.equal(url.searchParams.get("temporada"), "2025-2026");
        assert.equal(url.searchParams.get("data"), "2026-03-01");
        assert.equal(opcoes.headers, undefined);
        return Response.json({ response: [{
            id: 42, league: { name: "NBA" }, country: { name: "USA" },
            date: "2026-03-01T20:00:00-03:00", status: { short: "Q1" },
            teams: { home: { name: "Time A" }, away: { name: "Time B" } },
            scores: { home: { total: 0 }, away: { total: null } },
        }] });
    });
    const [jogo] = await pesquisarJogos({ liga: "12", temporada: "2025-2026", data: "2026-03-01" });
    assert.equal(jogo.casa.pontos, 0);
    assert.equal(jogo.visitante.pontos, null);
    assert.equal(jogo.casa.nome, "Time A");
    assert.equal(jogo.status, "1º quarto");
    assert.equal(jogo.aoVivo, true);
});

test("distingue retorno vazio de erro de autenticação e formato inválido", async (t) => {
    const mock = t.mock.method(globalThis, "fetch", async () => Response.json({ response: [] }));
    assert.deepEqual(await pesquisarJogos({ data: "2026-03-01" }), []);
    mock.mock.mockImplementation(async () => Response.json({ errors: { token: "Missing application key" }, response: [] }));
    await assert.rejects(buscarLigas(), /recusou/);
    mock.mock.mockImplementation(async () => Response.json({ response: {} }));
    await assert.rejects(buscarLigas(), /formato inesperado/);
});

test("mostra a mensagem do servidor em falhas e identifica HTML inesperado", async (t) => {
    const mock = t.mock.method(globalThis, "fetch", async () => Response.json({ erro: "Chave não configurada" }, { status: 503 }));
    await assert.rejects(buscarLigas(), /Chave não configurada/);
    mock.mock.mockImplementation(async () => new Response("<html></html>"));
    await assert.rejects(buscarLigas(), /resposta inválida/);
});

test("repassa cancelamento e traduz falha de conexão", async (t) => {
    const controller = new AbortController();
    const mock = t.mock.method(globalThis, "fetch", async (caminho, { signal }) => {
        assert.equal(signal, controller.signal);
        throw new DOMException("Cancelada", "AbortError");
    });
    await assert.rejects(buscarLigas({ signal: controller.signal }), { name: "AbortError" });
    mock.mock.mockImplementation(async () => { throw new TypeError("fetch failed"); });
    await assert.rejects(buscarLigas(), /conectar ao servidor/);
});
