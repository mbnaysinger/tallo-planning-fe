# tallo-planning-fe

Frontend do **Tallo Planning** — board de alocação semanal com raias por pessoa (desktop) e visão de dia (mobile), drag-and-drop com atualizações otimistas, descrição em Markdown e temas claro/escuro.

## Visão geral e dependências de serviço

A aplicação conversa com **dois backends**:

| Serviço | Papel | Comunicação |
|---|---|---|
| **nayz-auth** | Identity Provider: login, refresh token, usuários/pessoas/roles | `VITE_AUTH_API_URL` (REST) |
| **tallo-planning-api** | Domínio do board: atividades, squads, resumos, projetos | `VITE_TALLO_API_URL` (REST) |

Fluxo de autenticação: o login é feito no **nayz-auth** com o `app_id` da aplicação `TALLO-PLANNING` (`VITE_NAYZ_AUTH_APP_ID`). O JWT retornado carrega `roles[]`, `person_id` e `name` — o mesmo token é enviado às duas APIs. A camada única de HTTP (`src/lib/api.ts`) injeta o Bearer e faz **refresh transparente** no 401 (com fila anti-corrida); quando o refresh falha, o evento `tallo:unauthorized` derruba a sessão e redireciona ao login.

**Importante**: o usuário precisa existir no nayz-auth com **pessoa vinculada** (a app exige `require_person`) e uma role da app Tallo (`ADMIN`, `USER-FULL` ou `USER`). A gestão de usuários/pessoas/roles é feita no nayz-auth — este frontend apenas **lê** os claims para esconder/mostrar ações (a autorização real é do backend).

Gates de UI por role: `ADMIN` vê todas as raias, cria para terceiros (colaboradores) e gerencia squads; `USER-FULL` tem os mesmos poderes restritos à própria raia (clonar, excluir, tipo/projeto, mover entre semanas, revisão da própria semana); `USER` edita as próprias atividades com tipo/projeto read-only e movimentação apenas dentro da própria semana.

## Stack

- Vue 3 (`<script setup>` + TypeScript) + Vite
- Pinia (estado), vue-router (SPA history mode), axios
- Tailwind CSS v4 com tokens semânticos (dark/light via classe `dark`, persistido pelo `@vueuse/core`)
- `vuedraggable` (drag-and-drop), `date-fns` (semanas ISO), `markdown-it` + `DOMPurify` (descrição em Markdown sanitizada), `vue-sonner` (toasts), `lucide-vue-next` (ícones)

## Comportamentos-chave

- **Uma store, duas projeções**: o estado do board (`src/stores/board.ts`) é carregado por semana do endpoint agregado `GET /board?week=`. O board desktop (raias × Seg–Sex) e o DayView mobile (um dia por vez, breakpoint `lg`) são projeções do mesmo estado — navegar entre dias não refaz fetch.
- **Atualizações otimistas com rollback**: mover/reordenar cards, status, título e exclusão aplicam na UI imediatamente (snapshot → mutação → persistência → rollback + toast em falha). Criação/edição aguardam o servidor (autoritativo em `position`/`week`) e reconciliam com reload silencioso.
- **Concluir exige tempo executado**: clicar em "Concluída" abre uma mini-modal com o tempo atual pré-carregado; o PATCH envia status + `time_executed` juntos.
- **Campos de tempo `hh:mm`**: máscara automática (só dígitos, `:` inserido após os 2 primeiros), setas ↑/↓ = ±15min no desktop, botões −15/+15 no mobile, placeholder quando `00:00`.
- **Markdown**: editor com toolbar, prévia, ampliar e copiar (`MarkdownField`); renderização sempre sanitizada com DOMPurify; cards mostram preview em texto puro.
- **Mobile**: sem DnD — mover é editar a data no card; ações via bottom-sheet no tap (nada exclusivo de hover); modais full-screen; swipe para trocar de dia.

## Estrutura

```
src/
  lib/          api.ts (HTTP unificado + refresh), week.ts (semana ISO), jwt.ts, markdown.ts
  types/        contratos espelhando os backends
  stores/       auth.ts (claims/roles), board.ts (estado do board + optimistic)
  components/
    board/      PersonLane, DayColumn, ActivityCard, TimeBar, WeekControls,
                DayView (mobile), ActivityDetailSheet, BoardSkeleton
    modals/     ActivityModal, ExecutedTimeModal, WeeklySummaryModal
    fields/     TimeField (hh:mm mascarado), MarkdownField
    ui/         BaseButton, BaseInput, AppModal (full-screen no mobile), BottomSheet
  views/        LoginView, BoardView (orquestra desktop + mobile)
```

## Configuração

As variáveis `VITE_*` são resolvidas em **tempo de build** (ficam embutidas no bundle):

| Variável | Descrição |
|---|---|
| `VITE_AUTH_API_URL` | base do nayz-auth, ex.: `https://auth.exemplo.com/api/v1` |
| `VITE_TALLO_API_URL` | base do tallo-planning-api, ex.: `https://tallo.exemplo.com/api/v1` |
| `VITE_NAYZ_AUTH_APP_ID` | UUID da aplicação `TALLO-PLANNING` no nayz-auth |

## Desenvolvimento local

```bash
# pré-requisitos: Node 20+, nayz-auth (:8080) e tallo-planning-api (:8081) rodando
cp .env.exemple .env    # preencha o VITE_NAYZ_AUTH_APP_ID do seu ambiente
npm install
npm run dev             # http://localhost:5173

npm run build           # type-check (vue-tsc) + bundle de produção em dist/
```

## Docker (produção / VPS)

A imagem serve o bundle estático via Nginx (com fallback de SPA). Como as `VITE_*` são de build, **a imagem é construída por ambiente** via build args. Esses valores **não são segredos** — URLs públicas e o app_id acabam no bundle JavaScript de qualquer forma.

O deploy recomendado é pelo compose de referência do workspace (`deploy/docker-compose.yml`), que lê os build args do `.env` ao lado do compose:

```bash
# na VPS, ao lado do docker-compose.yml
cp .env.exemple .env    # VITE_AUTH_API_URL, VITE_TALLO_API_URL, VITE_NAYZ_AUTH_APP_ID
docker compose up -d --build tallo-fe
```

Build avulso (sem compose):

```bash
docker build -t tallo-planning-fe \
  --build-arg VITE_AUTH_API_URL='https://auth.seudominio.com/api/v1' \
  --build-arg VITE_TALLO_API_URL='https://tallo.seudominio.com/api/v1' \
  --build-arg VITE_NAYZ_AUTH_APP_ID='<uuid da app TALLO-PLANNING>' \
  .
```

Notas de deploy: exponha a porta apenas em `127.0.0.1` e publique via reverse proxy com TLS (Traefik, Caddy, Nginx da VPS); os assets com hash têm cache de 1 ano e o `index.html` não é cacheado pelo fallback; o CORS dos backends deve permitir o domínio deste frontend. Segredos de backend ficam nos `env_file` (chmod 600) dos respectivos serviços — nunca em build args.
