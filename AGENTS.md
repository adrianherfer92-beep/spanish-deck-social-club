<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Moderation roles are separate from profiles with a unique admin index; privileged server functions validate roles via the caller's RLS client. Reports and decisions use service-only atomic RPCs, and every room access checks account and room-player suspensions to prevent token-based bypasses.
- GIPHY reactions use the connector gateway only from room server functions; validate membership and general-audience media, enforce sending atomically in a service-only RPC, and keep reactions in player rows so GIF activity never resets turn timers. External GIF loading is opt-in to avoid unsolicited third-party requests.
- Generate DiceBear Bottts avatars locally as SVG data URIs; registered players use their owner-editable profiles.avatar_seed choice with an account-ID-derived fallback, and guests use their room-player ID, so profile, ranking and room avatars stay consistent without external tracking or image storage.
- Card game rules live as pure engines in `src/lib/games/*` (init/move/view/ranking); the server is authoritative and only sends each player their own view, so hidden cards never reach other browsers.
- Rooms, players and results tables are service-role only; all access goes through server functions in `src/lib/rooms.functions.ts`. Guests are identified by a per-room secret token in localStorage; signed-in users also by their bearer.
- Server mutations send a data-free broadcast ("cambio") on topic `sala:CODE`; clients refetch their own view on it, with a slow 10s poll fallback. Versioned updates prevent double moves. Game results and points are applied atomically by the service-only `apply_game_results` DB function.
- tsconfig relaxes noUncheckedIndexedAccess / exactOptionalPropertyTypes / noPropertyAccessFromIndexSignature to keep game engine code readable.
- Abandoned rooms are cleaned daily by pg_cron calling `cleanup_abandoned_rooms()`: unscored rooms idle >2 days are deleted; scored rooms are kept (ranking history) with their game state cleared.
- Turn timer: rooms.turn_seconds; any client calls skipTurn when the countdown (based on rooms.updated_at) expires, server re-checks elapsed time and applies a generic auto-move. Share image lives on the project CDN; og tags use the request origin via getOrigin (only emitted on https).
- Privacy (GDPR): accounts store only email, alias, stats and privacy_accepted_at; public alias never derives from real name/email. Data export and account deletion go through `src/lib/account.functions.ts` (deletion anonymizes results to "Jugador eliminado" before removing the auth user).
