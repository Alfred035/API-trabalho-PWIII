export default function Cabecalho() {
    return (
        <header className="cabecalho">
            <a className="pular-conteudo" href="#conteudo">Pular para o conteúdo</a>
            <div className="container cabecalho-conteudo">
                <a className="marca" href="/">
                    <span className="marca-bola" aria-hidden="true">◉</span>
                    Basketball
                </a>
                <span className="cabecalho-descricao">Jogos e placares</span>
            </div>
        </header>
    );
}
