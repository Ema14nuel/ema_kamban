# Dashboard de resultados y adaptación de pantallas

Entrega del 30 de octubre de 2026. Los indicadores están únicamente en el dashboard.

## Comportamiento

- Cuatro indicadores principales: cumplimiento recurrente, puntualidad, primeras
  finalizaciones y pendientes manuales vencidas (foto actual).
- Filtros Hoy, Semana, Mes, rango de hasta 366 días y tablero. Semana desde lunes;
  períodos en America/Bogota. Cada porcentaje muestra numerador y denominador.
- Gráfica diaria, resultados por tablero, manuales recuperadas y minutos Pomodoro
  registrados. Sin compromisos evaluables se muestra un guion, no un porcentaje falso.
- Las recurrentes vencidas no se muestran en columnas ni calendarios de tableros y
  consolidado, pero siguen contando en los resultados. Las manuales vencidas siguen
  visibles con halo y días vencidos. Las futuras esperan su fecha en columnas.
- La primera finalización y la fecha comprometida original se conservan al reabrir
  y reprogramar; todas las rutas de cambio de estado usan la misma transición.
- Archivar una tarjeta preserva el resultado. Borrar una programación cancela solo
  ocurrencias futuras pendientes sin trabajo, sin convertir las pasadas en manuales.
- Los cambios de escritura confirmados invalidan los indicadores; también se
  actualizan al volver a la aplicación y cambiar de día.

API autenticada: `GET /api/metrics/?start=AAAA-MM-DD&end=AAAA-MM-DD&board=ID`.
El tablero es opcional y se valida su propiedad. Los resultados nunca incluyen otros
usuarios. Las columnas personalizadas cuentan como trabajo no completado.

## Datos y migraciones

`0007` agrega origen, fecha original, primera finalización, precisión del histórico,
archivo, cancelación, metadatos de eventos e índices. `0008` reconstruye el origen
con FK/eventos; usa las fechas existentes como línea base y conserva precisión de
día cuando solo hay done_at. No inventa horas exactas ni entrega puntos retroactivos.

La reconstrucción no garantiza recuperar compromisos originales anteriores a la
entrega: la interfaz identifica esa limitación. No existe todavía un libro de puntos,
premios ni evaluación de calidad del resultado. El borrado completo de tableros
mantiene el comportamiento previo; una futura puntuación persistente debe conservar
sus movimientos independientemente de ese borrado.

Migración aplicada únicamente a la copia SQLite local separada de producción:
839 tarjetas, 737 identificadas como recurrentes y 86 finalizaciones con fecha.
Se verificó integridad SQLite, igualdad de conteos de usuarios, tableros, tarjetas,
programaciones, eventos y registros Pomodoro antes/después. Se creó un respaldo
previo dentro de `.local-backups`, fuera de Git. El respaldo original no se migró.

## Adaptación y acceso

- Navbar superior conservado; solo los tableros viven en el sidebar minimizable.
- En tablet el sidebar se abre sobre un fondo de cierre; en celular se oculta al
  minimizarlo para dar todo el ancho al contenido. Se cierra con Escape o navegación.
- El contenido tiene su propio desplazamiento vertical. La barra inferior reserva
  espacio para Nueva actividad/Pomodoro, evitando que cubran tarjetas e indicadores.
- Formularios y columnas se redistribuyen; tablas de histórico y usuarios se apilan.
  Calendario y gráfica usan desplazamiento horizontal local cuando hace falta.
- Selectores nativos en móvil, controles táctiles mayores, textos largos ajustables,
  paneles y diálogos limitados a la pantalla y preferencias de movimiento reducido.
- Diálogos con nombre accesible, cierre por Escape, foco contenido y restauración
  del foco. Calendario permite abrir también las actividades ocultas tras “más”.

## Validación

- 42 pruebas Django aprobadas, sobre base sintética en memoria.
- 17 pruebas Node aprobadas (sesión, permisos de datos y fechas/visibilidad).
- TypeScript y compilación de producción aprobados.
- Lint: únicamente la advertencia previa de actualización de estado en
  `ActivityDetailModal.tsx`; sin errores nuevos.
- Comprobación HTTP del backend local para los tres usuarios: esquema de métricas,
  fecha/zona, porcentajes y correspondencia entre tableros visibles y métricas.
- Pruebas Chromium con datos sintéticos, nombres largos y controles abiertos:
  320×740, 360×740, 390×740, 768×1000, 820×1000, 1024×1000, 1280×1000,
  1440×1000, 844×390 y 1024×600. Verifican desbordamiento de documento/contenido,
  separación de acciones, filtros, calendario, paneles, diálogos, menú y sidebar.
  Se usan toques emulados en los dispositivos táctiles y se comprueba Escape.
  Estas pruebas no sustituyen una prueba en dispositivos físicos iOS/Android.

Comandos desde frontend:

```powershell
npm run build
npm run lint
node --test tests/security.test.cjs tests/schedule.test.cjs
# Playwright debe estar instalado o indicado mediante PLAYWRIGHT_MODULE.
node tests/responsive.cjs
```

Backend:

```powershell
.venv/Scripts/python.exe -B manage.py test --settings=kamban_backend.test_settings
.venv/Scripts/python.exe -B manage.py makemigrations --check --dry-run --settings=kamban_backend.test_settings
```

## Producción

No se desplegó producción en esta entrega. Antes de publicar: verificar acceso SSH
actual, probar las migraciones en PostgreSQL (Docker Desktop no estaba ejecutándose),
crear respaldo fresco verificable y desplegar backend/frontend coordinadamente.
La API anterior no contiene `/metrics/`; frontend y backend deben actualizarse juntos.
