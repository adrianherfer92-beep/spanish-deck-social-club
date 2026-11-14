import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Privacidad — La Timba" },
      { name: "description", content: "Qué datos guarda La Timba, para qué y cómo ejercer tus derechos RGPD." },
      { property: "og:title", content: "Política de privacidad — La Timba" },
      { property: "og:description", content: "Datos mínimos, sin publicidad ni rastreo." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacidad,
});

function Privacidad() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-12 text-sm leading-relaxed">
      <h1 className="text-5xl">Privacidad</h1>
      <p>Guardamos lo mínimo para que puedas jugar y sumar puntos. Sin publicidad, sin rastreadores y sin vender datos.</p>
      <h2 className="text-2xl">Qué guardamos</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li><b>Correo y contraseña cifrada</b> (o tu cuenta de Google): solo para iniciar sesión. Nunca se muestran a otros jugadores.</li>
        <li><b>Nombre de jugador</b>: el alias que eliges; es lo único visible en mesas y ranking. No uses tu nombre real si no quieres.</li>
        <li><b>Puntos, partidas y victorias</b>, y el resultado de cada partida.</li>
        <li><b>Fecha en que aceptaste esta política.</b></li>
      </ul>
      <p>Si juegas como invitado no creamos cuenta: tu nombre solo vive en la mesa y tu navegador guarda una clave para reconectar.</p>
      <h2 className="text-2xl">Avatares</h2>
      <p>Tu avatar se genera en La Timba con DiceBear a partir de un identificador técnico, sin usar tu correo, tu nombre real ni una foto. Si eliges otro avatar, guardamos únicamente su código aleatorio en tu perfil para mostrarlo también en las mesas y el ranking. No enviamos datos ni solicitudes a DiceBear ni guardamos imágenes adicionales.</p>
      <p className="text-xs text-muted-foreground">Avatares <a href="https://bottts.com/" target="_blank" rel="noreferrer" className="underline">Bottts de Pablo Stanley</a>, mediante <a href="https://www.dicebear.com/" target="_blank" rel="noreferrer" className="underline">DiceBear</a>. Diseño libre para uso personal y comercial.</p>
      <h2 className="text-2xl">Para qué y base legal</h2>
      <p>Para prestar el servicio que pides (ejecución del servicio, art. 6.1.b RGPD) y con tu consentimiento al crear el perfil.</p>
      <h2 className="text-2xl">Cuánto tiempo</h2>
      <p>Mientras tengas cuenta. Las mesas abandonadas se borran a los 2 días. Si borras tu cuenta, tus datos se eliminan y tu historial queda anónimo como «Jugador eliminado».</p>
      <h2 className="text-2xl">Tus derechos</h2>
      <p>Desde <b>Mi perfil</b> puedes cambiar tu nombre, descargar todos tus datos y borrar tu cuenta al instante. También puedes oponerte o reclamar ante la Agencia Española de Protección de Datos (aepd.es).</p>
      <h2 className="text-2xl">Seguridad</h2>
      <p>Conexión cifrada, contraseñas comprobadas contra filtraciones conocidas, y cada jugador solo puede leer su propio perfil y sus propias cartas.</p>
    </main>
  );
}
