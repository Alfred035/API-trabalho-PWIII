export default function JogoCard({ jogo }) {
    const data = jogo.data ? new Date(jogo.data) : null;
    const dataValida = data && !Number.isNaN(data.getTime());
    const opcoes = { timeZone: "America/Sao_Paulo" };

    return (
        <article className="jogo-card">
            <div className="jogo-cabecalho">
                <span>{jogo.liga}</span>
                <span className={jogo.aoVivo ? "status status-ao-vivo" : "status"}>
                    {jogo.status}
                </span>
            </div>
            <h2 className="somente-leitor">{jogo.casa.nome} contra {jogo.visitante.nome}</h2>
            <div className="placar">
                {[jogo.casa, jogo.visitante].map((time, indice) => (
                    <div className="time" key={indice}>
                        {time.logo && (
                            <img className="time-logo" src={time.logo} alt="" loading="lazy"
                                onError={(event) => { event.currentTarget.hidden = true; }} />
                        )}
                        <span>{time.nome}</span>
                        <strong className="pontos">{time.pontos ?? "—"}</strong>
                    </div>
                ))}
            </div>
            <div className="jogo-rodape">
                {dataValida ? (
                    <time dateTime={jogo.data}>
                        {data.toLocaleDateString("pt-BR", opcoes)} às {data.toLocaleTimeString("pt-BR", {
                            ...opcoes, hour: "2-digit", minute: "2-digit",
                        })}
                    </time>
                ) : <span>Data não informada</span>}
                <span>{jogo.pais}</span>
            </div>
        </article>
    );
}
