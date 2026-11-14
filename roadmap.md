# DiceBear avatars
## Pagos por partida (EN PAUSA)
- [x] Crear producto de 1 € y pago integrado, sin suscripciones.
- [x] Aplicar una creación gratuita diaria por cuenta y excepción del administrador de forma atómica.
- [x] Confirmar pagos antes de permitir una creación adicional y evitar reutilizar el pago.
- [x] Mostrar límites, actualizar privacidad y probar compra, permisos y móvil.
- [x] Pausar la pasarela: PAYMENTS_ENABLED=false, creación gratuita ilimitada, /pago muestra aviso.
- [ ] Reactivar pagos en el futuro: poner PAYMENTS_ENABLED=true, reconectar Stripe y verificar consumo con una cuenta no administradora.
## Abandono y puntos
- [x] Añadir eliminación por el creador y abandono con penalizaciones atómicas.
- [x] Añadir confirmaciones y explicar el sistema de puntos.
- [x] Probar penalizaciones, permisos y continuidad de las partidas.
## Moderación
- [x] Añadir un único administrador, reportes privados limitados y decisiones auditadas.
- [x] Aplicar suspensiones temporales a cuentas e invitados en todas las acciones de mesa.
- [x] Añadir panel de moderación, reportes desde la mesa y privacidad.
- [x] Verificar permisos, reportes y suspensiones con pruebas y la aplicación.
## GIPHY
- [x] Add secure GIPHY search and room-only reactions with an atomic 30-second sending limit.
- [x] Add optional GIF display, privacy information and rule tests.
- [x] Verify two-player sending, limit enforcement and mobile display.

- [x] Add local DiceBear generation and privacy tests.
- [x] Show automatic avatars in profiles, rankings, lobbies and all four games.
- [x] Document privacy and attribution.
- [x] Verify two real guests from lobby into gameplay on desktop and mobile, with no DiceBear network requests.
- [x] Run avatar and routing tests; verify preview compilation.
- [x] Add shuffle preview and save the chosen avatar under owner-only profile access.
- [x] Verify saved avatars in profile, ranking and rooms with the current signed-in player.