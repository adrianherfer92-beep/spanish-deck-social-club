// Credenciales de jugador por sala (invitados y registrados), guardadas en este navegador.
export const getRoomToken = (code: string) =>
  typeof window === "undefined" ? "" : localStorage.getItem(`sala:${code.toUpperCase()}`) ?? "";
export const setRoomToken = (code: string, token: string) => {
  localStorage.setItem(`sala:${code.toUpperCase()}`, token);
  localStorage.setItem("ultima-sala", code.toUpperCase());
};
export const getGuestName = () => (typeof window === "undefined" ? "" : localStorage.getItem("nombre-invitado") ?? "");
export const setGuestName = (n: string) => localStorage.setItem("nombre-invitado", n);
export const getLastRoom = () => (typeof window === "undefined" ? "" : localStorage.getItem("ultima-sala") ?? "");
export const setLastRoom = (code: string) => localStorage.setItem("ultima-sala", code.toUpperCase());
export const clearLastRoom = () => localStorage.removeItem("ultima-sala");
