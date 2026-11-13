// Credenciales de jugador por sala (invitados y registrados), guardadas en este navegador.
export const getRoomToken = (code: string) =>
  typeof window === "undefined" ? "" : localStorage.getItem(`sala:${code.toUpperCase()}`) ?? "";
export const setRoomToken = (code: string, token: string) => localStorage.setItem(`sala:${code.toUpperCase()}`, token);
export const getGuestName = () => (typeof window === "undefined" ? "" : localStorage.getItem("nombre-invitado") ?? "");
export const setGuestName = (n: string) => localStorage.setItem("nombre-invitado", n);
