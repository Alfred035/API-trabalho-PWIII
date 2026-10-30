import { useEffect, useState } from "react";
import FiltrosJogos from "../components/FiltrosJogos.jsx";
import JogoCard from "../components/JogoCard.jsx";
import { buscarLigas, pesquisarJogos } from "../services/basketball.js";

export default function Jogos() {
    const [ligas, setLigas] = useState([]);
    const [carregandoLigas, setCarregandoLigas] = useState(true);
    const [erroLigas, setErroLigas] = useState("");
    const [tentativaLigas, setTentativaLigas] = useState(0);
    const [consulta, setConsulta] = useState(null);
    const [jogos, setJogos] = useState([]);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");

    // Carregamos as ligas e as temporadas disponíveis na API.
    useEffect(() => {
        const controller = new AbortController();
        let ativa = true;

        async function carregar() {
            try {
                const resultado = await buscarLigas({ signal: controller.signal });
                if (ativa) setLigas(resultado);
            } catch (falha) {
                if (ativa && falha.name !== "AbortError") setErroLigas(falha.message);
            } finally {
                if (ativa) setCarregandoLigas(false);
            }
        }

        carregar();
        return () => {
            ativa = false;
            controller.abort();
        };
    }, [tentativaLigas]);

    // Cancelamos a consulta anterior quando uma nova busca é enviada.
    useEffect(() => {
        if (!consulta) return;
        const controller = new AbortController();
        let ativa = true;

        async function carregar() {
            try {
                const resultado = await pesquisarJogos(consulta, { signal: controller.signal });
                if (ativa) setJogos(resultado);
            } catch (falha) {
                if (ativa && falha.name !== "AbortError") setErro(falha.message);
            } finally {
                if (ativa) setCarregando(false);
            }
        }

        carregar();
        return () => {
            ativa = false;
            controller.abort();
        };
    }, [consulta]);

    function buscar(filtros) {
        setCarregando(true);
        setErro("");
        setJogos([]);
        setConsulta({ ...filtros });
    }

    function tentarLigas() {
        setCarregandoLigas(true);
        setErroLigas("");
        setTentativaLigas((anterior) => anterior + 1);
    }

    return (
        <section aria-labelledby="titulo-jogos">
            <div className="apresentacao">
                <p className="categoria">API-SPORTS / BASQUETE</p>
                <h1 id="titulo-jogos">Dentro de quadra</h1>
                <p>Acompanhe os jogos, encontre sua liga e confira os placares.</p>
            </div>
            {erroLigas && (
                <div className="aviso" role="alert">
                    <p>Não foi possível carregar as ligas. {erroLigas}</p>
                    <button className="botao-secundario" type="button" onClick={tentarLigas}>
                        Tentar carregar ligas
                    </button>
                </div>
            )}
            <FiltrosJogos ligas={ligas} onBuscar={buscar} carregando={carregando}
                carregandoLigas={carregandoLigas} />
            <div className="resultados" aria-busy={carregando}>
                {!consulta && (
                    <div className="estado-vazio">
                        <h2>A próxima partida começa aqui</h2>
                        <p>Escolha os filtros acima e clique em Buscar jogos.</p>
                    </div>
                )}
                {carregando && <p role="status">Consultando os jogos na API...</p>}
                {!carregando && erro && (
                    <div className="aviso" role="alert">
                        <p>{erro}</p>
                        <button type="button" onClick={() => buscar(consulta)}>Tentar novamente</button>
                    </div>
                )}
                {consulta && !carregando && !erro && (
                    <>
                        <h2 className="titulo-resultados">Jogos encontrados <span>{jogos.length}</span></h2>
                        <p className="somente-leitor" role="status">{jogos.length} jogos encontrados.</p>
                        {jogos.length === 0 ? (
                            <div className="estado-vazio">
                                <p>Nenhum jogo encontrado. Tente outra data ou temporada.</p>
                            </div>
                        ) : (
                            <div className="grade-jogos">
                                {jogos.map((jogo) => <JogoCard key={jogo.id} jogo={jogo} />)}
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
