# Basketball

Consulta de jogos da **API-Sports Basketball v1**, feita com React e Vite. A estrutura foi adaptada do projeto OpenLibrary, com componentes simples, uma página de consulta e um serviço com `fetch`.

## Requisitos do trabalho

A aplicação permite escolher uma liga, temporada ou data e consultar os jogos de basquete. Os resultados aparecem em cards com os times, placares, status da partida e horário.

| Conceito solicitado | Implementação |
| --- | --- |
| Consumo de uma API pública | API-Sports Basketball v1, endpoints `/leagues` e `/games`. A API exige chave de autenticação. |
| Requisições HTTP | `fetch` em `src/services/basketball.js` consulta o servidor; `server/index.js` acessa a API com o cabeçalho `x-apisports-key`. |
| Componentes | `Cabecalho`, `FiltrosJogos`, `JogoCard` e a página `Jogos`. |
| Estados | `useState` guarda ligas, filtros, resultados, carregamento e mensagens de erro. |
| Efeitos | `useEffect` carrega as ligas e consulta os jogos quando a busca muda. `AbortController` cancela consultas anteriores. |
| Carregamento | A interface mostra mensagens de consulta e desabilita o botão durante a busca. |
| Tratamento de erros | Mensagens para falhas de conexão, autenticação, limite de consultas e respostas inválidas, com opção de tentar novamente. |
| Organização dos dados | Filtros com rótulos, cards responsivos e mensagem específica quando nenhum jogo é encontrado. |

O pequeno servidor Node.js mantém a chave fora do navegador. A interface e os estados são implementados em React, sem necessidade de C#.

## Como executar

Use Node.js 24.5 ou superior. Confira a versão com `node --version`.

Depois do `git clone`, entre na pasta do projeto e instale as dependências:

```bash
cd API-trabalho-PWIII
npm install
```

Se você já tinha clonado o repositório antes do envio do projeto, execute `git pull origin main` dentro da pasta antes de `npm install`.

Crie o `.env` a partir do modelo. No **Windows (PowerShell)**:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

No **Linux ou macOS**:

```bash
test -f .env || cp .env.example .env
```

Preencha a linha abaixo no `.env` com sua chave do painel da API-Sports e salve o arquivo:

```env
API_SPORTS_KEY=coloque_sua_chave_aqui
```

O `.env` é ignorado pelo Git; por isso, você precisa preenchê-lo uma vez no computador onde vai executar a aplicação. Depois de trocar a chave, reinicie `npm run dev`. Na nuvem, a variável pode ser injetada pelos segredos do ambiente, sem criar `.env`. Não use `VITE_API_SPORTS_KEY`: variáveis com `VITE_` ficam acessíveis no navegador.

Com o `.env` configurado, inicie tudo em **um único terminal**:

```bash
npm run dev
```

O comando inicia o servidor da API e o React juntos. Abra o endereço informado pelo Vite, normalmente `http://localhost:5173`. Mantenha esse terminal em execução e use `Ctrl+C` para encerrar os dois processos. Se um deles parar por erro, o outro também será encerrado.

Se você estava usando a versão com dois terminais, encerre os processos antigos com `Ctrl+C` antes de usar o novo comando, para liberar as portas.

O Vite encaminha as chamadas `/api` ao servidor na porta 3001. O servidor usa `x-apisports-key` para consultar exclusivamente `https://v1.basketball.api-sports.io`.

## Como consultar

- As ligas vêm de `/leagues`; as temporadas são as disponibilizadas para cada liga.
- Escolha uma data para consultar todos os jogos daquele dia, ou selecione liga e temporada. A data pode ser combinada com a liga ou ficar vazia para buscar a temporada inteira.
- A consulta usa `/games`, com `date`, `league`, `season` e `timezone`, conforme os filtros. Datas e horários usam o fuso de Brasília (`America/Sao_Paulo`).
- O acesso às datas e temporadas e o limite de consultas dependem do plano da API-Sports. Comece pela data de hoje para demonstrar a aplicação. Quando a API informa um intervalo de datas permitido pelo plano, a interface apresenta esse período em português. Não há atualização automática dos placares.
- Falhas em `errors` são tratadas mesmo com HTTP 200. `token: "Missing application key..."` é erro de autenticação, não uma lista de jogos vazia.

## Verificações

```bash
npm test
npm run lint
npm run build
```

`npm run preview` permite conferir o build localmente com o servidor ainda em execução; não é um servidor de produção. Os testes usam respostas simuladas para verificar filtros, autenticação, limites, falhas de conexão e conversão dos dados. Não consomem a cota da API nem substituem a validação com uma chave real.

## Estrutura

```text
server/
  index.js                  # Servidor e comunicação com a API-Sports
  index.test.js             # Testes das rotas
src/
  components/
    Cabecalho.jsx
    FiltrosJogos.jsx
    JogoCard.jsx
  pages/
    Jogos.jsx
  services/
    basketball.js           # Consultas ao servidor e conversão dos dados
    basketball.test.js
  App.jsx
  App.css
  index.css
  main.jsx
```

Na nuvem, permita o destino `v1.basketball.api-sports.io` e configure `API_SPORTS_KEY` nos segredos do ambiente. O servidor respeita o proxy HTTP/HTTPS do ambiente. Os logos retornados pela API são carregados diretamente pelo navegador.
