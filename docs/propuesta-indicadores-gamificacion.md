# Propuesta para autorización: indicadores y base de gamificación

Fecha: 30 de octubre de 2026. Estado: propuesta; no implementada ni desplegada.

Actualización de alcance: el usuario solicitó implementar los indicadores **solo en
el dashboard**, junto con la adaptación de la aplicación a tablet y celular. La
primera entrega implementada y sus comprobaciones se describen en
`validacion-dashboard-adaptable.md`. La gamificación y el despliegue en producción
siguen separados de esta entrega local.

## Entrega propuesta

Primera versión: indicadores en Inicio y Consolidado, filtros de período y tablero,
historial de cumplimiento confiable y preparación de datos para una futura
gamificación. Puntos, niveles, premios y clasificaciones quedan para una segunda
entrega con reglas aprobadas por separado.

Se incluyen los cambios locales ya revisados de navbar/sidebar y actividades
vencidas en la misma versión, con revisión del diff completo antes de publicar.
Se excluyen bases, respaldos, secretos y cambios personales ajenos a la entrega.

## Reglas de negocio

- Zona de negocio inicial: America/Bogota. Almacenar instantes en UTC, convertir
  en el servidor para determinar días y cortes. El navegador no decide vencimientos.
- En esta entrega, una actividad vence al terminar su fecha local. La hora existente
  representa programación y no cambia silenciosamente a plazo de vencimiento.
- Recurrentes sin completar: al terminar su día quedan perdidas, solo visibles en
  Histórico; no se recuperan ni reprograman. Una ocurrencia tiene identidad propia.
- No recurrentes sin completar: siguen pendientes o en su estado actual, con días
  vencidos y halo rojo. Se pueden completar tarde o reprogramar.
- Reprogramar cambia la agenda, pero conserva la primera fecha comprometida para
  medir puntualidad. Si originalmente no existía fecha, se fija al asignar la primera.
- Las completadas antes de vencer cuentan como cumplidas. Las manuales tardías
  cuentan como recuperadas; las recurrentes vencidas permanecen incumplidas.
- Las actividades sin fecha cuentan en resultados terminados, no en puntualidad.
- Sin compromisos evaluables, mostrar “Sin actividades evaluables”, no 0% ni 100%.
- Los períodos usan la fecha comprometida para cumplimiento y puntualidad, y la
  fecha efectiva de finalización para volumen de resultados y recuperaciones.
- Un compromiso es evaluable si su fecha original pertenece al período y ya cerró,
  o si ya se completó. Las actividades abiertas de hoy no generan incumplimiento
  anticipado. Las futuras se excluyen del porcentaje de compromisos vencidos.
- Reabrir no genera un segundo resultado ni borra el primer cumplimiento; mostrar
  por separado el estado actual. En la futura puntuación habrá una sola recompensa
  por actividad, con reversos explícitos si la regla aprobada así lo requiere.
- Borrar una actividad pasa a archivarla conservando sus resultados y trazabilidad.
  Quitar una programación cancela solo ocurrencias futuras aún no iniciadas; las
  ocurrencias que ya vencieron o tuvieron trabajo permanecen en el histórico.
- Todas las columnas se consideran trabajo sin completar salvo la columna fija
  `done`; las personalizadas no desaparecen de los indicadores por su tipo.

## Cambios de modelos

### Card

- `origin`: manual o recurrente, persistente e independiente de la FK `routine`.
- `original_due_date`: DateField nullable; primer compromiso, protegido en la API.
- `first_completed_at`: DateTimeField nullable; primera finalización verificada.
- `completion_precision`: exacta, solo fecha o desconocida; evita inventar horas
  al migrar datos antiguos.
- `archived_at`: DateTimeField nullable; reemplaza borrado físico desde la API.
- `cancelled_at` y `cancellation_reason`: permiten distinguir cancelación de pérdida.
  Una cancelación solo exime una ocurrencia futura sin trabajo previo; nunca permite
  retirar del denominador una actividad ya vencida.
- Índices según consultas: tablero/origen/fecha, tablero/primera finalización y
  tablero/archivo. Revisar planes con PostgreSQL antes de añadir índices redundantes.

Los campos existentes `date`, `time` y `done_at` se conservan inicialmente para
compatibilidad. Se valida y centraliza su escritura; una conversión masiva de los
CharField a fechas tipadas no es necesaria para esta primera entrega.

### CardEvent

- Agregar `metadata` JSON con estado anterior/nuevo, fechas anterior/nueva,
  motivo y origen de la operación, además del detalle legible existente.
- Acciones explícitas: completar, reabrir, reprogramar, cancelar y archivar.
- Conservar eventos antiguos y no permitir que el cliente escriba auditoría.

### Routine y LogEntry

- Conservar la estructura de Routine. Al generar tarjetas se fija `origin` y el
  compromiso original; se conserva ese origen al borrar la programación.
- Mantener LogEntry como registro de minutos declarados al cerrar un Pomodoro.
  No presentarlo como tiempo de trabajo verificado ni usarlo solo para premiar
  productividad. No hace falta modificar ese modelo en la primera entrega.

## Migración de históricos

Migraciones aditivas, separando esquema y reconstrucción de datos. La reconstrucción
debe producir un informe de registros reconstruidos, aproximados y desconocidos.

- Origen: FK de rutina o evento de creación recurrente; no inferirlo por el título.
- Fecha original: primer evento fiable de reprogramación, si se puede reconstruir;
  si no, conservar fecha disponible como línea base marcada, no como dato exacto.
- Primera finalización: primer evento fiable de entrada a done; como alternativa,
  `done_at` con precisión de día. No asignar la hora actual a finalizaciones antiguas.
- Registros sin evidencia suficiente se muestran como desconocidos y se excluyen
  de métricas que requieran ese dato, informando su cobertura.
- No asignar puntos retroactivos. La futura gamificación tendrá fecha de inicio.
- Probar la migración en base sintética y copia aislada; comprobar cantidades y
  resultados antes/después. No cambiar contraseñas ni usuarios.

## Backend

Crear un servicio de transiciones utilizado por PATCH/PUT, move y reprogramación,
para que todas las rutas apliquen las mismas reglas. Primera finalización, estado y
evento se escriben en la misma transacción; bloquear la tarjeta para evitar dobles
finalizaciones concurrentes. Los campos de auditoría son de solo lectura.

Nuevo endpoint autenticado:

`GET /api/metrics/?from=YYYY-MM-DD&to=YYYY-MM-DD&board=<id opcional>`

Devuelve únicamente datos del usuario, agregados por período y tablero, con fecha
de cálculo, zona horaria, versión de reglas, numeradores, denominadores y cobertura
de datos históricos. Limitar rango y validar fechas y propiedad del tablero.

Indicadores de la primera entrega:

1. Cumplimiento recurrente: ocurrencias completadas a tiempo / recurrentes evaluables.
2. Puntualidad: compromisos con fecha completados a tiempo / compromisos evaluables.
3. Resultados: actividades cuya primera finalización ocurrió dentro del período.
4. Vencidas pendientes: manuales abiertas con fecha programada anterior a hoy,
   incluyendo antigüedad 1–2, 3–7 y más de 7 días; es una foto actual, etiquetada así.
5. Recuperadas: manuales cuya primera finalización fue tardía y ocurrió en el período.
6. Enfoque: minutos registrados en LogEntry durante el período, como dato auxiliar.

Los porcentajes de cumplimiento por fecha comprometida describen la cohorte
seleccionada; no se presentan como un balance congelado al final de un período.
Para auditoría de puntuaciones históricas se añadiría un libro de recompensas
inmutable en la fase siguiente.

## Frontend

Cuatro tarjetas principales en Inicio y Consolidado: cumplimiento recurrente,
puntualidad, resultados y vencidas pendientes. Debajo: evolución diaria y desglose
por tablero, recuperadas y minutos de enfoque. Filtros Hoy, Semana, Mes y rango;
semana de lunes a domingo en Bogotá. Mostrar porcentajes junto al conteo x/y.

Estados de carga, error y sin datos; diseño adaptable y accesible. El resumen se
actualiza al completar, reprogramar, archivar o registrar un Pomodoro, y al cambiar
el día o volver a la aplicación. Backend y frontend comparten las reglas de corte.

## Futura gamificación, fuera del alcance inicial

Modelos posibles: RewardRule (regla/version), RewardEntry (movimiento auditable e
idempotente), Achievement y UserAchievement. El saldo se deriva del historial de
movimientos, no de un contador editable. Una recompensa por actividad/regla, sin
duplicarla al reabrir, reintentar peticiones o editar fechas. Importancia, objetivos
y criterios de aceptación se incorporarán cuando se defina cómo medir resultados.

## Validación y despliegue

1. Desarrollo en rama codex/indicadores-resultados, incluyendo revisión explícita de
   los cambios de interfaz y vencimientos ya presentes en el workspace.
2. Pruebas de fórmulas, cortes de Bogotá, cambio de día, recurrentes vencidas,
   columnas personalizadas, cancelaciones, reapertura, concurrencia y aislamiento
   por usuario; compilación y pruebas frontend/backend.
3. Probar migraciones también sobre PostgreSQL, además de la copia local SQLite.
4. Demo local y reporte de pruebas/migración para revisar la entrega concreta.
5. Verificar acceso y destino actual de producción: el SSH documentado no respondió
   en la revisión anterior. No hay despliegue automatizado versionado confirmado.
6. Crear y verificar respaldo nuevo de base y medios; guardar commit e imágenes de
   la versión anterior. Ensayar restauración en una base separada.
7. Ventana de mantenimiento: detener escrituras, ejecutar migración una sola vez,
   actualizar backend/frontend con Compose y verificar health, login, métricas,
   tarjetas e histórico de cada usuario. No reemplazar producción por la copia local.
8. Reversión: con esquema aditivo compatible, volver al código/imágenes anteriores;
   restaurar datos únicamente si hace falta y considerando las escrituras posteriores
   al respaldo. Mantener la aplicación cerrada si falla una migración.

La configuración versionada usa Docker Compose, PostgreSQL 16, Gunicorn y Nginx.
Su correspondencia con la infraestructura activa debe verificarse antes de publicar.

Referencias de implementación:
- https://docs.djangoproject.com/en/5.2/ref/migration-operations/#runpython
- https://docs.djangoproject.com/en/5.2/topics/db/transactions/
