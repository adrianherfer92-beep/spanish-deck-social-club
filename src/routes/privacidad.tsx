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
      <p>Guardamos lo mínimo para que puedas jugar y sumar puntos. Sin publicidad ni venta de datos. Los GIFs externos son opcionales.</p>
      <h2 className="text-2xl">Qué guardamos</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li><b>Correo y contraseña cifrada</b> (o tu cuenta de Google): solo para iniciar sesión. Nunca se muestran a otros jugadores.</li>
        <li><b>Nombre de jugador</b>: el alias que eliges; es lo único visible en mesas y ranking. No uses tu nombre real si no quieres.</li>
        <li><b>Puntos, partidas y victorias</b>, el resultado de cada partida y las penalizaciones por abandono o eliminación (motivo, puntos y fecha). Estas penalizaciones se conservan mientras tengas cuenta y se borran al eliminarla.</li>
        <li><b>Fecha en que aceptaste esta política.</b></li>
      </ul>
      <p>Si juegas como invitado no creamos cuenta: tu nombre solo vive en la mesa y tu navegador guarda una clave para reconectar.</p>
      <h2 className="text-2xl">Avatares</h2>
      <p>Tu avatar se genera en La Timba con DiceBear a partir de un identificador técnico, sin usar tu correo, tu nombre real ni una foto. Si eliges otro avatar, guardamos únicamente su código aleatorio en tu perfil para mostrarlo también en las mesas y el ranking. No enviamos datos ni solicitudes a DiceBear ni guardamos imágenes adicionales.</p>
      <p className="text-xs text-muted-foreground">Avatares <a href="https://bottts.com/" target="_blank" rel="noreferrer" className="underline">Bottts de Pablo Stanley</a>, mediante <a href="https://www.dicebear.com/" target="_blank" rel="noreferrer" className="underline">DiceBear</a>. Diseño libre para uso personal y comercial.</p>
      <h2 className="text-2xl">Para qué y base legal</h2>
      <h2 className="text-2xl">GIFs de GIPHY</h2>
      <p>Los GIFs están desactivados inicialmente. Si activas «Mostrar GIFs de GIPHY», tu navegador carga imágenes desde GIPHY, que recibe tu dirección IP y datos técnicos de la conexión. Las búsquedas se envían a GIPHY a través de nuestro servidor, sin tu correo, alias ni clave de sala; no escribas datos personales en ellas. Puedes desactivarlos en cualquier momento. Consulta la <a href="https://support.giphy.com/hc/en-us/articles/360032872931-GIPHY-Privacy-Policy" target="_blank" rel="noreferrer" className="underline">privacidad de GIPHY</a>, incluida la información sobre transferencias internacionales.</p>
      <p>Guardamos temporalmente el identificador y enlace del último GIF por jugador y la hora de envío para aplicar el límite de uno cada 30 segundos. No guardamos un historial de conversaciones. El GIF desaparece de la mesa tras 15 segundos; su enlace se elimina al actualizar la mesa después de ese plazo o al borrar la mesa. La hora del último envío se conserva mientras exista el jugador en la mesa.</p>
      <p>Para prestar el servicio que pides (ejecución del servicio, art. 6.1.b RGPD) y con tu consentimiento al crear el perfil.</p>
      <h2 className="text-2xl">Cuánto tiempo</h2>
      <p>Mientras tengas cuenta. Las mesas abandonadas se borran a los 2 días. Si borras tu cuenta, tus datos se eliminan y tu historial queda anónimo como «Jugador eliminado».</p>
      <h2 className="text-2xl">Tus derechos</h2>
      <h2 className="text-2xl">Reportes y moderación</h2>
      <p>Los jugadores de una mesa pueden reportar a otro jugador con un motivo y un comentario opcional. Guardamos los identificadores de ambos, la mesa, el alias reportado y la fecha. Los reportes son privados: solo el administrador puede revisarlos, suspender temporalmente la participación y registrar el motivo de su decisión. No recibe correos, contraseñas, claves de acceso ni cartas ocultas. No hay sanciones automáticas por acumular reportes.</p>
      <p>Tratamos estos datos para proteger a los jugadores y prevenir abusos (interés legítimo, art. 6.1.f RGPD). Las suspensiones vencen automáticamente. Un invitado queda suspendido en su identidad de esa mesa; no rastreamos su dispositivo para impedirle crear otra identidad. Los reportes y decisiones se conservan durante un máximo de 90 días desde su resolución, o desde su envío si siguen pendientes. Al borrar una cuenta se eliminan sus comentarios enviados y se desvinculan sus identificadores de la moderación.</p>
      <p>Desde <b>Mi perfil</b> puedes cambiar tu nombre, descargar todos tus datos y borrar tu cuenta al instante. También puedes oponerte o reclamar ante la Agencia Española de Protección de Datos (aepd.es).</p>
      <h2 className="text-2xl">Seguridad</h2>
      <h2 className="text-2xl">Pagos y límite diario</h2>
      <p>Crear una partida requiere cuenta. Guardamos las creaciones por cuenta y día de Madrid para ofrecer una gratuita diaria, y cada compra de 1 € para permitir una creación adicional. Los invitados pueden unirse gratis. El administrador está exento del límite.</p>
      <p>Stripe procesa el pago y recibe tu correo, un identificador técnico de cuenta y los datos de facturación que introduzcas. La Timba no recibe ni guarda el número de tarjeta ni el código de seguridad. Guardamos el identificador de compra, importe, estado, fecha y uso. Puedes consultar la <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer" className="underline">política de privacidad de Stripe</a>. La base legal es la ejecución de la compra y las obligaciones fiscales aplicables. Al borrar tu cuenta se eliminan los registros de uso y compras vinculados en La Timba; Stripe puede conservar información por sus obligaciones legales.</p>
      <p>Conexión cifrada, contraseñas comprobadas contra filtraciones conocidas, y cada jugador solo puede leer su propio perfil y sus propias cartas.</p>
    </main>
  );
}
