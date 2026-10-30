async function consultar(caminho, { signal } = {}) {
    let resposta;
    try {
        resposta = await fetch(caminho, { signal });
    } catch (falha) {
        if (falha.name === "AbortError") throw falha;
        throw new Error("Não foi possível conectar ao servidor. Tente novamente.", { cause: falha });
    }

    let dados;
    try {
        dados = await resposta.json();
    } catch {
        throw new Error("O servidor retornou uma resposta inválida. Verifique se ele está em execução.");
    }

    if (!resposta.ok) throw new Error(dados.erro || `Falha HTTP: ${resposta.status}`);
    if (dados.errors && Object.keys(dados.errors).length > 0) {
        throw new Error("A API recusou a consulta. Verifique a autenticação e os limites do seu plano.");
    }
    if (!Array.isArray(dados.response)) throw new Error("A API retornou um formato inesperado.");
    return dados.response;
}

export async function buscarLigas({ signal } = {}) {
    const dados = await consultar("/api/ligas", { signal });

    return dados
        .filter((item) => item.id != null)
        .map((item) => ({
            id: item.id,
            nome: item.name || "Liga não informada",
            pais: item.country?.name || "País não informado",
            temporadas: (Array.isArray(item.seasons) ? item.seasons : [])
                .map((temporada) => ({ ano: temporada.season, atual: Boolean(temporada.current) }))
                .sort((a, b) => Number(b.atual) - Number(a.atual) || String(b.ano).localeCompare(String(a.ano))),
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
}

const nomesStatus = {
    NS: "Não iniciado", Q1: "1º quarto", Q2: "2º quarto", HT: "Intervalo",
    Q3: "3º quarto", Q4: "4º quarto", OT: "Prorrogação", BT: "Intervalo",
    FT: "Encerrado", AOT: "Encerrado após prorrogação", POST: "Adiado",
    CANC: "Cancelado", INTR: "Interrompido", ABD: "Abandonado", AW: "Vitória atribuída",
};

export async function pesquisarJogos({ liga, temporada, data }, { signal } = {}) {
    const parametros = new URLSearchParams();
    if (liga) parametros.set("liga", liga);
    if (temporada) parametros.set("temporada", temporada);
    if (data) parametros.set("data", data);

    const dados = await consultar("/api/jogos?" + parametros.toString(), { signal });

    return dados
        .filter((item) => item.id != null)
        .map((item) => ({
            id: item.id,
            liga: item.league?.name || "Liga não informada",
            pais: item.country?.name || "País não informado",
            data: item.date || null,
            status: nomesStatus[item.status?.short] || item.status?.long || "Status não informado",
            aoVivo: ["Q1", "Q2", "HT", "Q3", "Q4", "OT", "BT"].includes(item.status?.short),
            casa: {
                nome: item.teams?.home?.name || "Time da casa",
                logo: item.teams?.home?.logo || null,
                pontos: item.scores?.home?.total ?? null,
            },
            visitante: {
                nome: item.teams?.away?.name || "Time visitante",
                logo: item.teams?.away?.logo || null,
                pontos: item.scores?.away?.total ?? null,
            },
        }));
}
