import Cabecalho from "./components/Cabecalho.jsx";
import Jogos from "./pages/Jogos.jsx";
import "./App.css";

export default function App() {
    return (
        <>
            <Cabecalho />
            <main id="conteudo" className="container" tabIndex={-1}>
                <Jogos />
            </main>
            <footer className="container rodape">
                Dados fornecidos pela API-Sports Basketball.
            </footer>
        </>
    );
}
