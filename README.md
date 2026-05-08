# Lillo Digital

Painel e TV para o açougue rodando em um site único na Cloudflare Pages.

## Arquitetura

- `/admin` para o painel de edição no celular ou no computador
- `/tv` para a tela que roda no navegador da TV
- `/api/catalog` para ler e salvar o catálogo
- `/api/youtube-info` para buscar título e canal de vídeos do YouTube
- Cloudflare D1 para guardar o catálogo entre deploys

## O que o dono da loja pode fazer

- Criar páginas fixas com produtos e preços
- Criar páginas de vídeo com URL do YouTube
- Reordenar as páginas
- Editar textos, cores e ofertas
- Abrir a TV em modo slideshow no navegador

## Estrutura principal

- `web-admin/index.html`: landing page com atalhos para admin e TV
- `web-admin/admin.html`: painel de edição
- `web-admin/tv.html`: tela pública da TV
- `web-admin/app.js`: lógica do painel
- `web-admin/tv.js`: lógica da TV
- `functions/`: Functions do Cloudflare Pages
- `web-admin/data/catalog.seed.json`: catálogo inicial
- `wrangler.toml`: configuração do Pages output

## Como publicar no Cloudflare

1. Crie um projeto no Cloudflare Pages apontando para este repositório.
2. Use `web-admin` como build output directory.
3. Adicione uma binding D1 com o nome `CATALOG_DB`.
4. Abra:
   - `https://seu-site.pages.dev/admin`
   - `https://seu-site.pages.dev/tv`

## Como criar a D1

Você pode criar a base pelo dashboard ou com Wrangler.

Exemplo:

```bash
npx wrangler d1 create lillo_catalog
```

Depois, adicione a binding `CATALOG_DB` ao projeto Pages.

## Fluxo de uso

1. O dono abre `/admin`.
2. Cria páginas fixas e vídeos.
3. O conteúdo é salvo no D1.
4. A TV abre `/tv`.
5. A tela busca o catálogo remoto e atualiza automaticamente.

## Build Android

O app Android antigo continua no projeto, mas o caminho principal agora é o site.

```bash
./gradlew assembleDebug
```

## Comandos úteis na Cloudflare

```bash
npm run dev:cloudflare
npm run deploy:cloudflare
```

## Observação sobre vídeos

Alguns vídeos do YouTube podem bloquear incorporação. Quando isso acontecer, a TV avança para a próxima página.
