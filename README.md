# Lillo Digital

Painel e TV para o açougue rodando em um site único na Netlify.

## Como ficou a arquitetura

- `/admin` para o painel de edição no celular ou no computador
- `/tv` para a tela que roda no navegador da TV
- `/api/catalog` para ler e salvar o catálogo
- `/api/youtube-info` para buscar título e canal de vídeos do YouTube
- Netlify Blobs para guardar o catálogo entre deploys

## O que o dono da loja pode fazer

- Criar páginas fixas com produtos e preços
- Criar páginas de vídeo com URL do YouTube
- Reordenar as páginas
- Editar textos, cores e ofertas
- Abrir a TV em modo slideshow no navegador

## Estrutura principal

- `web-admin/index.html`: página inicial com atalhos para admin e TV
- `web-admin/admin.html`: painel de edição
- `web-admin/tv.html`: tela pública da TV
- `web-admin/app.js`: lógica do painel
- `web-admin/tv.js`: lógica da TV
- `web-admin/functions/`: funções da Netlify
- `web-admin/data/catalog.seed.json`: catálogo inicial
- `netlify.toml`: rotas e configuração do deploy

## Como rodar localmente

### Painel legado

Se quiser testar o servidor local antigo:

```bash
node web-admin/server.js
```

### Site na Netlify

1. Faça deploy deste repositório na Netlify.
2. Use `web-admin` como pasta publicada.
3. Garanta que as funções estejam em `web-admin/functions`.
4. Abra:
   - `https://seu-site.netlify.app/admin`
   - `https://seu-site.netlify.app/tv`

## Fluxo de uso

1. O dono abre `/admin`.
2. Cria páginas fixas e vídeos.
3. O conteúdo é salvo em Netlify Blobs.
4. A TV abre `/tv`.
5. A tela busca o catálogo remoto e atualiza automaticamente.

## Build Android

O app Android antigo continua no projeto, mas o caminho principal agora é o site.

```bash
./gradlew assembleDebug
```

## Observação sobre vídeos

Alguns vídeos do YouTube podem bloquear incorporação. Quando isso acontecer, a TV avança para a próxima página.
