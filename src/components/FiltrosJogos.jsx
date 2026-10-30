import { useState } from "react";

function dataDeHoje() {
    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());

    const valor = (tipo) => partes.find((parte) => parte.type === tipo).value;
    return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

export default function FiltrosJogos({ ligas, onBuscar, carregando, carregandoLigas }) {
    const [liga, setLiga] = useState("");
    const [temporada, setTemporada] = useState("");
    const ligaSelecionada = ligas.find((item) => String(item.id) === liga);
    const temporadas = ligaSelecionada?.temporadas ?? [];
    const temporadaAtual = temporada || String(temporadas[0]?.ano ?? "");

    function escolherLiga(event) {
        setLiga(event.target.value);
        setTemporada("");
    }

    function enviar(event) {
        event.preventDefault();
        const dados = new FormData(event.currentTarget);
        const data = String(dados.get("data") ?? "");

        if (!data && !liga) return;
        onBuscar({ liga, temporada: liga ? temporadaAtual : "", data });
    }

    return (
        <form className="filtros" onSubmit={enviar} aria-label="Buscar jogos de basquete">
            <div className="campo">
                <label htmlFor="liga">Liga</label>
                <select id="liga" name="liga" value={liga} onChange={escolherLiga}
                    disabled={carregandoLigas || carregando}>
                    <option value="">{carregandoLigas ? "Carregando ligas..." : "Todas as ligas"}</option>
                    {ligas.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.nome} — {item.pais}
                        </option>
                    ))}
                </select>
            </div>
            <div className="campo">
                <label htmlFor="temporada">Temporada</label>
                <select id="temporada" name="temporada" value={temporadaAtual}
                    onChange={(event) => setTemporada(event.target.value)}
                    disabled={!liga || carregando} required={Boolean(liga)}>
                    {!temporadas.length && <option value="">Selecione uma liga</option>}
                    {temporadas.map((item) => (
                        <option key={item.ano} value={item.ano}>
                            {item.ano}{item.atual ? " (atual)" : ""}
                        </option>
                    ))}
                </select>
            </div>
            <div className="campo">
                <label htmlFor="data">Data</label>
                <input id="data" name="data" type="date" defaultValue={dataDeHoje()}
                    required={!liga} disabled={carregando} />
            </div>
            <button type="submit" disabled={carregando}>
                {carregando ? "Buscando..." : "Buscar jogos"}
            </button>
            <p className="ajuda-filtros">Busque por data ou selecione uma liga e temporada. Horários de Brasília.</p>
        </form>
    );
}
