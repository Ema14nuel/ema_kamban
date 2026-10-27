# Informe de seguridad de Ema Kamban

Fecha: 27 de octubre de 2026 (America/Bogota).

> **Actualización de correcciones locales:** el código y las pruebas se modificaron posteriormente con autorización del usuario. La auditoría y el plan originales se conservan como antecedente; sus líneas corresponden a la instantánea anterior. Consulte «Estado de las correcciones y validación» al final para el estado vigente. No se ha desplegado.

## Alcance y método

Revisión estática del código local de Django/DRF, autenticación JWT, serializers, permisos, frontend React, dependencias declaradas, Docker y Nginx. Las líneas citadas se verificaron al redactar este informe y pueden cambiar con futuras ediciones. No se encontraron archivos AGENTS.md en la búsqueda del proyecto ni en los directorios ascendentes revisados.

No se abrieron bases de datos, respaldos, archivos de secretos ni datos personales. No se iniciaron servicios, migraciones, instalaciones, actualizaciones, pruebas activas, construcciones de imágenes ni consultas a producción. La única modificación de esta tarea es este documento; el plan siguiente no se ha ejecutado.

«Confirmado por código» significa que el mecanismo se deduce de los archivos revisados, no que se haya reproducido un ataque ni detectado un incidente. La configuración efectiva, las versiones instaladas y los controles externos de producción no fueron verificados. La revisión de avisos no constituye un análisis exhaustivo de todas las dependencias transitivas o imágenes del sistema.

## Resumen priorizado

| ID | Gravedad / prioridad | Hallazgo | Estado |
| --- | --- | --- | --- |
| H01 | Alta / P1 | Cambio de relaciones hacia tableros ajenos | Confirmado por código |
| H02 | Alta condicional / P1 | Clave de firma alternativa incluida en código | Valor inseguro confirmado; uso en producción desconocido |
| H03 | Media / P1 | Pillow declarado vulnerable al procesar avatares | Versión declarada afectada; instalación y explotación no verificadas |
| H04 | Media / P2 | Falta de revocación de JWT al salir o cambiar contraseña | Confirmado en la configuración revisada |
| H05 | Media condicional / P2 | Sin límites visibles contra intentos masivos de login | Ausencia local confirmada; perímetro desconocido |
| H06 | Media condicional / P1 | DEBUG y transporte HTTPS no garantizados | Depende de entorno y proxy externo |
| H07 | Media condicional / P1 | Posible inclusión de respaldos en imágenes Docker | Exclusión incompleta confirmada; imágenes no inspeccionadas |
| H08 | Media / P2 | Validación y atomicidad insuficientes en acciones | Confirmado por código; sin reproducción dinámica |
| H09 | Alta condicional / P1 | Un staff puede restablecer la contraseña de un superusuario | Ruta confirmada por código; existencia de superusuarios desconocida |
| H10 | Media / P2 | Datos del navegador sobreviven al cambio de cuenta | Confirmado por código; visualización no reproducida |

P1: atender primero; P2: siguiente fase. No se asignan puntuaciones CVSS propias sin validar las condiciones del despliegue.

## Hallazgos

### H01 — Cambio de relaciones hacia tableros ajenos

**Evidencia:** `backend/boards/serializers.py:11-12`, `:18-19` y `:50-51` exponen `board` como campo editable en columnas, tarjetas y rutinas. `backend/boards/views.py:62-65`, `:91-94` y `:197-199` verifican propietario al crear. La actualización de tarjetas guarda directamente en `:99-102`; columnas y rutinas heredan la actualización sin una comprobación equivalente. Los querysets filtran el objeto original por dueño (`:60`, `:85`, `:191`), pero eso no valida la nueva relación.

**Condiciones e impacto:** un usuario autenticado con un objeto propio y conocimiento de un ID de tablero ajeno puede reasignarlo a ese tablero. Esto permite introducir contenido ajeno e inconsistencias de columnas, rutinas y tarjetas. No demuestra lectura arbitraria ni modificación directa de objetos que originalmente pertenecían a la víctima.

**Recomendación:** hacer inmutable `board` tras la creación, si el producto no necesita traslados. Si los permite, limitar el queryset del campo al dueño y comprobar el destino en todas las escrituras, con validación de consistencia de estado y relaciones. Véanse [permisos de DRF](https://www.django-rest-framework.org/api-guide/permissions/) y [relaciones en serializers](https://www.django-rest-framework.org/api-guide/relations/).

### H02 — Clave de firma alternativa incluida en código

**Evidencia:** `backend/kamban_backend/settings.py:28` acepta una clave literal si falta `DJANGO_SECRET_KEY`. No se reproduce su valor aquí. `SIMPLE_JWT`, en `:91-95`, no define una clave independiente.

**Condiciones e impacto:** si el despliegue utiliza esa alternativa conocida, la integridad de los JWT queda comprometida y puede permitir suplantación de usuarios. No se ha comprobado la clave de producción. Una variable vacía tampoco debe aceptarse como configuración válida.

**Recomendación:** exigir un secreto externo robusto y abortar el arranque si falta o está vacío. Evaluar clave independiente para JWT. Si se usó la alternativa, rotar las claves y gestionar la invalidación de sesiones de manera coordinada. [Configuración oficial de Simple JWT](https://django-rest-framework-simplejwt.readthedocs.io/en/latest/settings.html).

### H03 — Pillow vulnerable en el procesamiento de avatares

**Evidencia local:** `backend/requirements.txt:14` fija `Pillow==11.1.0`; `backend/accounts/models.py:16` declara un `ImageField`, expuesto por `MeSerializer` en `backend/accounts/serializers.py:45-49`. `backend/accounts/views.py:27-32` requiere autenticación para modificar el perfil. La validación de imágenes de Django utiliza Pillow: [ImageField de formularios](https://docs.djangoproject.com/en/5.2/ref/forms/fields/#imagefield).

**Avisos oficiales consultados nuevamente el 27 de octubre de 2026:**

| Aviso | Versiones afectadas según el aviso | Versión corregida indicada |
| --- | --- | --- |
| [GHSA-xgh8-jp6q-p5x8](https://github.com/python-pillow/Pillow/security/advisories/GHSA-xgh8-jp6q-p5x8), ReDoS al abrir XBM | Hasta 12.3.0 inclusive | 13.0.0 |
| [GHSA-74r2-7ff9-mjj2](https://github.com/python-pillow/Pillow/security/advisories/GHSA-74r2-7ff9-mjj2), complejidad cuadrática al abrir GIF | 5.4.0 a 12.3.0 | 13.0.0 |

La versión declarada 11.1.0 está en ambos intervalos. Los avisos afectan la apertura de imágenes, antes de que una validación posterior de dimensiones pueda proteger la aplicación.

**Condiciones e impacto:** si se instala esa versión y el endpoint procesa contenido con los decodificadores afectados, una carga de avatar de un usuario autenticado puede consumir CPU y ocupar trabajadores. No se ejecutaron archivos de prueba ni se confirmó una interrupción real. No se afirma ejecución remota de código por estos dos avisos.

**Recomendación:** actualizar a una versión corregida compatible, tomando 13.0.0 como referencia de los avisos, y verificar los avisos vigentes al implementar. Restringir formatos antes de usar decodificadores no necesarios y limitar tamaño, frecuencia y recursos de procesamiento. No basta confiar en extensión o Content-Type del cliente.

### H04 — Tokens sin revocación al salir o cambiar contraseña

**Evidencia:** `frontend/src/store/authStore.ts:95` solo elimina el estado local al salir. `backend/kamban_backend/settings.py:91-95` configura acceso de una hora, renovación de siete días y desactiva rotación. No configura `CHECK_REVOKE_TOKEN` ni la aplicación de blacklist; `backend/accounts/urls.py:10-14` no expone cierre de sesión en servidor.

**Condiciones e impacto:** una copia previamente sustraída de los tokens puede seguir siendo útil tras cerrar sesión. Con la configuración predeterminada de Simple JWT, un cambio de contraseña no implementa por sí solo la comprobación de revocación por contraseña. La cuenta debe seguir activa y los tokens no haber expirado.

**Recomendación:** definir una política explícita de sesiones: revocación al cambiar contraseña, invalidación del refresh al salir, rotación y detección de reutilización según las necesidades. Reducir la ventana de acceso y coordinar frontend y backend. [Settings](https://django-rest-framework-simplejwt.readthedocs.io/en/latest/settings.html), [blacklist](https://django-rest-framework-simplejwt.readthedocs.io/en/latest/blacklist_app.html).

### H05 — Sin protección visible contra intentos masivos de login

**Evidencia:** `backend/accounts/views.py:23-24` no agrega límites al login; `backend/kamban_backend/settings.py:82-89` no configura throttling. `nginx/default.conf:12-18` reenvía la API sin límites de frecuencia.

**Condiciones e impacto:** si no existe protección externa, el endpoint permite intentos repetidos de autenticación y consumo de recursos de comprobación de contraseñas. No se verificaron WAF, balanceador, CDN o controles del host.

**Recomendación:** límites por cuenta y origen en un perímetro confiable, demoras progresivas y alertas, evitando bloqueos que permitan denegar servicio a terceros. El throttling de DRF puede complementar la política, pero su documentación indica que no es por sí solo una defensa suficiente contra fuerza bruta o DoS: [documentación oficial](https://www.django-rest-framework.org/api-guide/throttling/).

### H06 — DEBUG y HTTPS no garantizados

**Evidencia:** `backend/kamban_backend/settings.py:31` usa DEBUG activado por defecto. No se configuran explícitamente cookies seguras, redirección HTTPS ni HSTS. `nginx/default.conf:2` escucha HTTP y `docker-compose.prod.yml:55-56` publica `8010:80`; `:31` recibe DEBUG del entorno.

**Condiciones e impacto:** sin terminación TLS y restricciones externas adecuadas, credenciales y JWT podrían circular por HTTP. DEBUG activo podría revelar información interna ante errores. La ausencia de TLS en este contenedor no demuestra ausencia de HTTPS público: puede existir otro proxy. No se inspeccionó el entorno efectivo.

**Recomendación:** DEBUG desactivado por defecto; verificar HTTPS público obligatorio, acceso directo restringido, cookies seguras del administrador y reconocimiento correcto del protocolo del proxy. Configurar HSTS después de validar el dominio y sus rutas. Confiar cabeceras de proxy solo desde componentes controlados. [Checklist oficial de Django](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/).

### H07 — Posible inclusión de respaldos en imágenes

**Evidencia:** `backend/.dockerignore:5` excluye el nombre exacto `db.sqlite3`, pero no variantes de respaldo. `backend/Dockerfile.prod:17` usa `COPY . .`. La comprobación previa de estado Git detectó un archivo con sufijo de respaldo dentro de backend; no se abrió ni volvió a inspeccionar.

**Condiciones e impacto:** construir una imagen desde un contexto que contenga respaldos no excluidos puede incorporar datos privados en sus capas. No se construyeron ni inspeccionaron imágenes, ni se afirma que un registro o despliegue existente contenga datos.

**Recomendación:** excluir variantes de bases y respaldos del contexto y preferir una lista explícita de archivos necesarios. Revisar imágenes publicadas por un procedimiento autorizado si se confirma una construcción previa con esos archivos. Estar sin seguimiento en Git no evita que Docker los copie. [Contexto y dockerignore](https://docs.docker.com/build/building/context/#dockerignore-files).

### H08 — Validación y atomicidad insuficientes

**Evidencia:** `backend/boards/views.py:171` convierte minutos sin capturar errores ni validar un intervalo; `:172-182` guarda el contador antes de crear el registro, sin transacción. `:205` y `:221-227` asumen que `days` y sus valores son diccionarios, aunque `backend/boards/serializers.py:47-51` no valida su estructura. El bucle de `views.py:220` limita actividades generadas, no días recorridos. `:239-250` crea rutina, tarjetas y eventos sin una transacción común.

**Impacto:** entradas de tipo incorrecto pueden causar errores 500; una falla entre escrituras puede dejar contadores o rutinas incompletos. Rangos extensos sin días activados pueden consumir trabajo innecesario. El alcance inicial corresponde a usuarios autenticados y sus objetos; no demuestra acceso a datos ajenos.

**Recomendación:** serializers de entrada con tipos, límites, fechas y estructura de horario; límite explícito del rango; transacciones para escrituras relacionadas y actualización atómica del contador cuando corresponda. [Validación DRF](https://www.django-rest-framework.org/api-guide/serializers/#validation), [transacciones Django](https://docs.djangoproject.com/en/5.2/topics/db/transactions/).

## Observaciones complementarias

- `frontend/src/store/authStore.ts:138-140` persiste tokens en el almacenamiento predeterminado de Zustand, accesible a JavaScript del mismo origen. Aumenta el impacto de un eventual XSS; esta revisión no encontró una inyección XSS concreta. Evaluar cookies HttpOnly con protección CSRF como parte de un rediseño de sesiones, sin cambiar el transporte de tokens aisladamente.
- Los listados no tienen paginación configurada y `BoardSerializer` incluye todas las tarjetas y columnas (`backend/boards/serializers.py:38-44`). Evaluar límites y paginación para evitar degradación al crecer el volumen.
- `backend/boards/tests.py:1-3` y `backend/accounts/tests.py:1-3` son plantillas sin pruebas de permisos. La cobertura efectiva de seguridad no está demostrada.
- El filtrado por propietario en lecturas, la asignación del dueño al crear tableros y el control `IsAdmin` del administrador de usuarios son controles presentes. No eliminan H01, que afecta la relación de destino durante actualizaciones.

## Segunda pasada estática del código

Realizada después de guardar la primera versión del informe, el mismo día. Se siguieron los flujos de actualización de usuarios, cambio de sesión, cachés de Zustand, acciones de tarjetas, eliminación de rutinas y representación de contenido del usuario. No se ejecutó la aplicación ni se accedió a datos.

### H09 — Staff puede restablecer credenciales de superusuarios

**Evidencia:** `backend/accounts/views.py:11-13` autoriza a cualquier usuario activo autenticado con `is_staff`; `:35-40` expone todos los usuarios sin excluir superusuarios ni imponer permisos de objeto. `backend/accounts/serializers.py:11` acepta una contraseña y `:21-26` la aplica con `set_password`. `:17-19` también deja modificables email e `is_active`.

**Condiciones e impacto:** si existen cuentas superusuario y cuentas staff con menores privilegios, una cuenta staff puede cambiar credenciales de un superusuario por la API. La condición `is_superuser` del destinatario se conserva, por lo que la apropiación de esa cuenta permite escalar privilegios dentro de Django. No se consultó si tales cuentas existen ni se probaron credenciales. Si el producto equipara deliberadamente staff a control total, debe explicitarlo; Django distingue ambos roles.

**Recomendación:** reservar la administración de superusuarios a superusuarios, aplicar permisos de objeto a todas las operaciones sobre usuarios y definir quién puede conceder `is_staff`, desactivar, borrar o cambiar credenciales de cada categoría. No depender de que el frontend oculte campos. [Permisos de Django](https://docs.djangoproject.com/en/5.2/topics/auth/default/#permissions-and-authorization).

### H10 — Cachés del navegador sin separación por cuenta

**Evidencia:** `frontend/src/store/authStore.ts:95` solo limpia autenticación; no vacía los stores de tableros, rutinas, registros ni usuarios. `frontend/src/store/boardStore.ts:206-213`, `routineStore.ts:88-94`, `logStore.ts:43-49` y `adminUsersStore.ts:67-74` conservan datos anteriores hasta una respuesta correcta y no los eliminan al fallar. `frontend/src/components/layout/Shell.tsx:51-56` inicia la recarga después de montar la interfaz. `frontend/src/components/boards/BoardsHome.tsx:9,17,34` renderiza el store disponible. `frontend/src/store/pomodoroStore.ts:102-104` persiste tareas e IDs bajo una clave común a todas las cuentas.

**Condiciones e impacto:** al salir y entrar con otra cuenta en la misma página y navegador, los datos anteriores pueden aparecer mientras llega la respuesta nueva o permanecer si la carga falla. Una respuesta iniciada bajo la sesión anterior puede llegar después y repoblar un store, porque las solicitudes no comprueban identidad de sesión al guardar. Es exposición local de información ya descargada, no una demostración de que el servidor permita leer objetos ajenos. Las peticiones posteriores siguen sujetas a permisos del backend.

**Recomendación:** limpiar datos y tareas al cambiar identidad, particionar persistencia por usuario, invalidar solicitudes antiguas y bloquear representación de datos hasta completar una carga asociada a la sesión actual. Revisar también colas de cambios diferidos en `boardStore.ts:102-137` para que no sobrevivan al cambio de cuenta.

### Confirmaciones y matices para limitar falsos positivos

- H01 queda confirmado por el flujo de actualización; el filtro del objeto original no protege la nueva relación. No se amplía a lectura arbitraria de objetos preexistentes de otra cuenta.
- Historial, notas, movimiento y pomodoro llaman a `self.get_object()` sobre el queryset filtrado por propietario (`backend/boards/views.py:117`, `:152`, `:158`, `:170`). No se identificó un bypass independiente de ese filtro.
- `MeSerializer` marca `is_staff` como solo lectura (`backend/accounts/serializers.py:49`). No se encontró elevación de usuario normal a staff mediante edición de su propio perfil. H09 requiere staff previo.
- La eliminación de rutinas usa las tarjetas vinculadas a la rutina (`backend/boards/views.py:265-271`), pero confía en una fecha del cliente sin validarla. Esto puede afectar qué historial propio se conserva; no se afirma borrado arbitrario de tarjetas ajenas.
- `frontend/src/components/immersive/ImmersiveMode.tsx:28` construye el iframe sobre un dominio fijo de YouTube, y `frontend/src/lib/youtube.ts:2` restringe los caracteres del identificador. El vídeo alternativo carga una URL en el navegador (`ImmersiveMode.tsx:33`); no se encontró una descarga de esa URL por el backend que sustente SSRF.
- Las búsquedas de sumideros comunes no encontraron SQL textual, ejecución de comandos o evaluación dinámica en el código de aplicación revisado. Las cadenas de contenido se representan mediante React; no se identificó un XSS concreto. Estas búsquedas no prueban ausencia total de inyección, ni certifican dependencias.
- Las fotografías se sirven directamente por Nginx (`nginx/default.conf:38-40`) sin control de sesión. Confirmar si son públicas por diseño; si deben ser privadas, será necesario servirlas mediante autorización. No se clasifica automáticamente como vulnerabilidad sin ese requisito.

## Plan de corrección propuesto — no ejecutado

Todas las pruebas siguientes deberán realizarse posteriormente con autorización, en un entorno aislado y datos sintéticos. No utilizar la base local que se está sincronizando ni datos de producción.

### Fase 1 — Aislamiento y contención (P1)

| Trabajo | Archivos o componentes | Criterios de aceptación y pruebas |
| --- | --- | --- |
| Corregir H01 | `backend/boards/serializers.py`, `backend/boards/views.py`, `backend/boards/tests.py` | Con dos usuarios sintéticos, crear y actualizar tarjeta, columna y rutina hacia otro dueño se rechaza sin cambios. Cubrir PUT y PATCH, lecturas y acciones de detalle. Las operaciones permitidas sobre objetos propios siguen funcionando. |
| Proteger cuentas privilegiadas (H09) | `backend/accounts/views.py`, `backend/accounts/serializers.py`, `backend/accounts/tests.py` | Una matriz con usuario normal, staff y superusuario sintéticos demuestra que staff no puede cambiar credenciales, estado, email ni borrar cuentas de privilegio superior. Conceder roles requiere el permiso definido. Probar todas las acciones del viewset. |
| Exigir secreto seguro y DEBUG seguro (H02/H06) | `backend/kamban_backend/settings.py`, ejemplos de entorno y Compose | Arranque falla con secreto ausente o vacío; DEBUG queda desactivado por defecto. Pruebas de configuración sin conexión a datos reales. Si se requiere rotación, documentar invalidación y recuperación de sesiones antes de desplegar. |
| Evitar inclusión de datos en imágenes (H07) | `backend/.dockerignore`, `backend/Dockerfile.prod` | En un contexto sintético, marcadores ficticios con nombres de bases y respaldos no se incluyen. Revisar el contexto y, posteriormente, la imagen de prueba; no usar archivos privados como fixtures. |
| Corregir Pillow (H03) | `backend/requirements.txt`, validación de avatar en `backend/accounts/serializers.py`, pruebas de cuentas | Versión resuelta fuera de ambos intervalos afectados; avatares válidos funcionan; tipos no permitidos y tamaños fuera de política se rechazan. Validar controles con fixtures inocuos y presupuesto de recursos, sin cargas de DoS contra servicios compartidos. |

### Fase 2 — Sesiones, acceso y consistencia (P2)

| Trabajo | Archivos o componentes | Criterios de aceptación y pruebas |
| --- | --- | --- |
| Revocar sesiones (H04) | settings, vistas/URLs de cuentas, `frontend/src/store/authStore.ts` | Un refresh cerrado no renueva; tokens previos al cambio de contraseña dejan de autorizar según la política definida. Probar renovación normal, expiración, cierre y reutilización. Evaluar requisitos de almacenamiento/migraciones solo en esta futura implementación autorizada. |
| Limitar autenticación (H05) | Nginx o perímetro, login y observabilidad | Exceso controlado de intentos sintéticos se limita, el usuario legítimo puede recuperarse y las cabeceras de origen no permiten saltarse el control. No registrar contraseñas ni tokens. |
| Validar y hacer atómicas las acciones (H08) | serializers/vistas/pruebas de boards | Tipos incorrectos, fechas inválidas y minutos fuera del intervalo dan 400 sin escrituras. Una falla simulada revierte todas las escrituras relacionadas. Rangos se rechazan antes del bucle y la concurrencia no pierde incrementos. |
| Separar sesiones del navegador (H10) | stores de autenticación, tableros, rutinas, registros, usuarios y pomodoro; `Shell.tsx` | Con dos cuentas sintéticas en la misma pestaña, no aparecen datos anteriores ante red lenta o fallida. Una respuesta anterior retrasada no repuebla la sesión nueva. Tareas y colas se limpian o particionan; no se envían cambios pendientes bajo una identidad diferente. |

### Fase 3 — Verificación del despliegue y mantenimiento (P2)

1. Verificar, mediante acceso autorizado y sin extraer valores secretos, que producción usa clave propia, DEBUG desactivado, HTTPS obligatorio y restricciones del puerto HTTP. Probar redirecciones y cookies con cuentas sintéticas en staging.
2. Revisar dependencias directas/transitivas del lockfile y versiones efectivamente desplegadas contra avisos oficiales. Registrar fecha y versión resuelta; no asumir que la ausencia de hallazgos en este informe certifica las demás dependencias.
3. Añadir límites/paginación y una política de cargas de archivos; medir con datos sintéticos representativos.
4. Ejecutar regresión funcional y de autorización en staging. Criterio de salida: H01 cerrado, condiciones de H02/H06 verificadas, H03 corregido, exclusiones H07 probadas y riesgos restantes con responsable y fecha acordados.

## Límites y decisiones pendientes

No se certifica seguridad de producción, ausencia de incidentes ni ausencia de otras vulnerabilidades. No se inspeccionaron secretos, historial completo de Git, infraestructura externa, imágenes existentes o datos. Las decisiones principales son si se permiten traslados entre tableros propios, qué política de revocación se necesita y dónde se termina y exige HTTPS. Ninguna de estas decisiones requiere interrumpir o modificar la sincronización de datos durante esta tarea documental.


## Estado de las correcciones y validación

Actualizado el 27 de octubre de 2026. Se aplicaron correcciones locales para los diez hallazgos, sin consultar ni modificar bases o respaldos existentes. La modificación previa de la raíz .gitignore se respetó. No hubo commit, push, arranque de servicios de aplicación ni despliegue.

| Hallazgo | Corrección local | Validación / pendiente |
| --- | --- | --- |
| H01 | OwnedBoardSerializer restringe las FK al dueño y hace inmutable board en tarjetas, columnas y rutinas. | PUT/PATCH y creaciones con dos usuarios sintéticos; accesos y acciones ajenas rechazados. |
| H02 | Eliminada la clave alternativa. Arranque falla ante clave vacía, corta, repetitiva o marcador conocido. DEBUG desactivado por defecto. | Pruebas de configuración sin dotenv; las claves reales no se inspeccionaron ni rotaron. Proveer una clave robusta externa es obligatorio. |
| H03 | Pillow fijado en 13.0.0; SafeAvatarField acepta solo decodificadores PNG/JPEG, máximo 2 MB, 2048 px por lado y 4 millones de píxeles. Almacena PNG nuevo sin metadatos. UI comunica límites y maneja errores. | Dependencias instaladas en un entorno temporal Python 3.12 y regresiones de imágenes ejecutadas. El entorno activo Python 3.10/Pillow 11.1 no se modificó. Usar Python 3.11 o posterior, preferiblemente 3.12 como Docker. |
| H04 | Access de 5 minutos, refresh rotativo, blacklist, comprobación de contraseña y auth_version. Logout revoca todas las sesiones de la cuenta; también admite un access válido durante la rotación. Frontend conserva refresh rotado y comparte renovaciones concurrentes de la misma pestaña. | Pruebas de replay, cambio de contraseña, logout, cuenta eliminada/inactiva y nuevo login. Requiere migración accounts 0003 y migraciones de token_blacklist antes de utilizar la aplicación actualizada. |
| H05 | Límites DRF por cuenta/IP en login y por IP para sesiones; Nginx aplica límites compartidos entre workers en autenticación, admin y API. No se confía en X-Forwarded-For del cliente. | Pruebas de 429 por cuenta y origen. La caché DRF predeterminada es por proceso; complementa a Nginx, no reemplaza protección perimetral distribuida. Verificar/tunar la cadena de proxy real antes de desplegar: varios usuarios pueden compartir el límite del proxy. |
| H06 | Cookies seguras y redirección HTTPS por defecto, HSTS, headers de seguridad, confianza en protocolo de proxy solo mediante opción explícita; Compose fija DEBUG=False y publica web únicamente en loopback. Nginx rechaza tráfico sin protocolo HTTPS aportado por el proxy confiable. | Pruebas de defaults de Django y Compose config válidas. Falta configurar/verificar TLS y el proxy del host. La configuración no inicia HTTPS por sí sola. |
| H07 | Dockerignore excluye variantes de bases, respaldos y secretos; Dockerfile.prod copia una lista explícita de fuentes en lugar de todo backend. | Revisión estática de patrones y COPY; no se construyeron/inspeccionaron imágenes existentes ni se leyó el respaldo local. |
| H08 | Serializers de notas, minutos, movimientos, fechas, horas y horarios; rango de rutina máximo 366 días; operaciones relacionadas atómicas, contador con F(), bloqueo del tablero en movimientos y detalle de evento acotado. | Pruebas de entradas inválidas y rollback simulado de pomodoro, movimiento y rutina. Se conserva la API de arrays para no romper los clientes; paginación es una mejora posterior, no una vulnerabilidad confirmada cerrada por estas pruebas. |
| H09 | Staff solo administra usuarios ordinarios; no puede modificar/borrar otras cuentas staff o superusuarios ni conceder staff. Superusuario conserva administración privilegiada. Actualizaciones se bloquean dentro de transacciones. | Matriz sintética de roles, métodos y concesión de privilegios. El perfil propio sigue disponible por /auth/me/. |
| H10 | Limpieza de stores, selección UI, tareas y colas al cambiar sesión; respuestas tardías se descartan por generación de sesión; pomodoro registra propietario; cambios de cuenta entre pestañas limpian datos y remontan Shell. | Regresiones de respuestas tardías, 401 antiguos, login concurrente, cachés, tareas, cola diferida y cambios entre pestañas. Renovaciones de la misma cuenta no vacían los datos de otra pestaña. |

### Resultado de pruebas locales

- **30 pruebas backend aprobadas** con Python 3.12 y todas las dependencias de requirements.txt, incluido Pillow 13.0.0, instaladas en un entorno temporal independiente. SQLite en memoria y almacenamiento de archivos InMemoryStorage: sin bases, media ni dotenv existentes.
- **11 pruebas frontend aprobadas** con node:test, ejecutando los stores/API reales con fetch y almacenamiento simulados. Incluyen perfil con access expirado y refresh rotativo.
- TypeScript sin errores; build de Vite correcto, generado en un directorio temporal con envDir desactivado para no incorporar .env locales.
- Prueba de navegador Chromium con build y API simulada: login, navegación a tableros, tarjeta y logout; sin errores JavaScript y sin contenido previo visible tras salir. No equivale a una prueba de integración con un servidor real.
- Django check correcto; makemigrations --check --dry-run sin cambios pendientes de definición; pip check sin incompatibilidades. Todos con configuración sintética aislada.
- Compose de producción validado con --env-file .env.prod.example y valores sintéticos, sin arrancar contenedores. El cliente Docker emitió una advertencia de acceso a su configuración personal; la validación terminó correctamente.
- Revisión de diff y espacios sin errores. Oxlint no reporta errores; conserva dos advertencias anteriores en ActivityDetailModal.tsx y Navbar.tsx sobre setState en efectos.
- No se ejecutó nginx -t: no hay binario local y la descarga del binario oficial de validación agotó el tiempo de red. La configuración se revisó estáticamente. No se construyeron imágenes ni se inició Docker/Nginx.

### Migraciones preparadas, no aplicadas a bases existentes

- accounts/migrations/0003_user_auth_version.py añade el contador de revocación, con valor inicial 0.
- Se habilita la aplicación de blacklist de Simple JWT; sus migraciones de dependencia deben ejecutarse en el futuro despliegue autorizado.
- boards/migrations/0006_alter_card_options.py registra ordering de Card ya presente en el modelo pero ausente en el estado de migraciones anterior; cambia metadatos de Django, sin transformación de datos.
- Las migraciones se ejecutaron únicamente como parte del runner de pruebas sobre memoria. Al actualizar el entorno real, los tokens antiguos sin auth_version deben volver a autenticarse.

### Requisitos y límites antes de usar/desplegar

1. Usar Python 3.12 (o al menos 3.11 para Pillow 13) y reinstalar requirements en un entorno nuevo; no reutilizar a ciegas el entorno Python 3.10 existente. No se reemplazó el entorno activo.
2. Proveer DJANGO_SECRET_KEY externa robusta de al menos 50 caracteres, hosts y orígenes correctos. Para desarrollo HTTP local, DEBUG=True debe ser explícito; para producción está fijado a False en Compose.
3. Cuando termine la sincronización y se autorice operar sobre la base elegida, aplicar las migraciones pendientes. No ejecutar la aplicación con este código contra un esquema sin actualizar. No se ejecutó ese paso aquí.
4. Configurar el proxy TLS del host para conectar a 127.0.0.1:8010 y sobrescribir Host y X-Forwarded-Proto=https. No exponer el puerto HTTP directamente; ejecutar nginx -t y verificar HTTPS/headers en staging antes de publicar.
5. El logout implementado cierra todas las sesiones de la cuenta. Sin conectividad, limpia el navegador y muestra que la revocación del servidor no pudo confirmarse; no puede garantizar revocación offline.
6. Programar, durante la futura operación autorizada, la limpieza de tokens expirados de blacklist. No se creó ninguna automatización ni se ejecutó limpieza sobre datos existentes.
7. Quedan como decisiones de producto o mejoras no confirmadas: privacidad de avatares públicos, paginación y eventual transporte de tokens mediante cookies HttpOnly. Los JWT siguen en almacenamiento del navegador; no se afirma haber eliminado el impacto de un XSS futuro.
8. No se probó concurrencia real en PostgreSQL ni tráfico TLS/rate limiting de un despliegue activo. Los bloqueos y transacciones están implementados y sus rollbacks probados en SQLite; corresponde validar la integración PostgreSQL/proxy en staging aislado antes del despliegue.

Referencias de compatibilidad y corrección: [Pillow 13.0.0](https://pillow.readthedocs.io/en/stable/releasenotes/13.0.0.html), [metadatos oficiales PyPI](https://pypi.org/pypi/Pillow/13.0.0/json), [Simple JWT blacklist](https://django-rest-framework-simplejwt.readthedocs.io/en/stable/blacklist_app.html). Las referencias de los avisos originales se conservan en H03.

### Cómo repetir las comprobaciones sin datos existentes

Con un entorno Python 3.12 que tenga requirements.txt instalado, desde backend:

```powershell
python -B manage.py test accounts boards kamban_backend.test_security_config --settings=kamban_backend.test_settings --noinput
python -B manage.py check --settings=kamban_backend.test_settings
python -B manage.py makemigrations --check --dry-run --settings=kamban_backend.test_settings
python -m pip check
```

Desde frontend, con las dependencias del lockfile instaladas:

```powershell
npm run test:security
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
npm run lint
```

Los tests backend fuerzan memoria y desactivan dotenv desde test_settings; no sustituyen la preparación manual de un entorno local normal. No ejecutar comandos de migración ni el arranque habitual sobre la base en sincronización hasta que el usuario autorice ese paso.
