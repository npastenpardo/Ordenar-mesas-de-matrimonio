# Organizador de mesas — versión online compartida

Esta carpeta contiene el sitio web, 2 endpoints privados de Vercel y la base de datos para Supabase. Incluye la nómina original en la exportación con la columna **Número de mesa**. Se sincroniza entre navegadores mediante consultas cada 5 segundos.

## 1) Crear la base de datos Supabase
1. Visita https://supabase.com/dashboard y crea un proyecto nuevo (guarda la contraseña de base de datos que te pida Supabase).
2. Abre el proyecto → **SQL Editor** → **New query**.
3. Copia y ejecuta el contenido completo de `schema.sql`. Esto crea una única fila de datos y una función de guardado con control de versión.
4. En **Project Settings** → **Data API / API** copia la **Project URL** y la **secret key** (`sb_secret_...`, si está disponible), o la **service_role** legacy. **Jamás uses la clave pública anon/publishable para el servidor ni publiques la clave secreta.**

## 2) Publicar la web en Vercel
**Alternativa simple con GitHub** (el ZIP debe descomprimirse antes):
1. Crea un repositorio privado en https://github.com/new.
2. Sube a la raíz del repositorio el contenido de esta carpeta (`api`, `public`, `package.json`, `vercel.json`, `schema.sql`). **No subas contraseñas ni archivos `.env`.**
3. En https://vercel.com/new conecta GitHub y elige este repositorio, framework **Other**. Directorio raíz por defecto (`./`); no agregues comandos de build.
4. Antes de desplegar, configura en Vercel → Project → **Settings → Environment Variables**:

| Nombre | Valor |
|---|---|
| `SUPABASE_URL` | URL completa de tu proyecto Supabase, por ejemplo `https://xyz.supabase.co` |
| `SUPABASE_SECRET_KEY` | Clave secreta Supabase (`sb_secret_...`) o `service_role` legacy |
| `SHARED_PASSWORD` | Contraseña familiar larga, idealmente 16+ caracteres |
| `SESSION_SECRET` | Cadena secreta aleatoria única de al menos 32 caracteres |

Puedes generar `SESSION_SECRET` con este comando en tu computador si tienes Node.js: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. **No debe coincidir con `SHARED_PASSWORD`.**

5. Pulsa **Deploy**. Si agregaste las variables después del primer Deploy, ve a Deployments → Redeploy para que se apliquen.
6. Entra al dominio `*.vercel.app`, ingresa la contraseña familiar, importa la nómina y comparte el enlace con tu familia.

**Alternativa terminal sin GitHub:** instala Node.js y, desde esta carpeta, ejecuta `npx vercel` y luego `npx vercel --prod`. Configura variables en el proyecto desde el dashboard y vuelve a desplegar después.

## 3) Uso
- **Importar** `.xlsx`, `.xls` o `.csv`. Selecciona la columna de nombre y, opcionalmente, de grupo.
- **Arrastrar** invitados desde la columna izquierda a una mesa o entre mesas, o usar el botón de asignación.
- **Añadir mesas**, modificar capacidad o devolver personas a la lista.
- **Exportar nómina**: descarga Excel conservando las columnas de origen y añadiendo `Número de mesa`. Los invitados sin mesa quedan vacíos.
- **Respaldar**: el botón Guardar respaldo descarga un JSON del estado actual. Úsalo antes de importaciones o grandes cambios.
- **Compartir**: entrega a cada familiar el dominio y la contraseña (por separado, si puedes).

## 4) Sincronización y límites
- Al entrar, cada navegador carga el estado compartido de Supabase. Mientras la pestaña está activa y no tiene modificaciones pendientes, revisa novedades cada **5 segundos**. No es actualización instantánea.
- Si dos usuarios editan exactamente a la vez, el servidor **rechaza el segundo guardado** (HTTP 409) en vez de sobrescribir silenciosamente. Esa persona verá un aviso: primero debe descargar un respaldo de sus cambios y luego recargar para ver los nuevos datos. En esta V1 **no se fusionan automáticamente** las ediciones simultáneas.
- La contraseña compartida no distingue quién hizo cada cambio y no implementa auditoría. Usa una clave larga y **no publiques la página ni la contraseña**. Para reforzar protección contra intentos de fuerza bruta, se puede añadir un proveedor de rate limiting a `/api/login` en una versión futura.
- Supabase y Vercel tienen límites y condiciones según plan; revisa sus términos vigentes. Si Supabase pausa un proyecto inactivo, podrías necesitar reactivarlo.
- El Excel se procesa dentro del navegador mediante SheetJS cargado desde CDN. Por eso la primera importación/exportación XLSX requiere acceso a internet. CSV y respaldo JSON no necesitan la librería.
- La tabla usa RLS sin permisos anónimos; la clave de servicio se usa exclusivamente en Vercel. Nunca insertar secretos en `public/index.html`.

## 5) Archivos
- `public/index.html`: interfaz.
- `api/login.js`: inicio y cierre de sesión con cookie `HttpOnly` firmada.
- `api/state.js`: lectura y escritura segura de la nómina centralizada.
- `api/_auth.js`: comprobación de sesión.
- `schema.sql`: tabla y función de control de versión.
- `vercel.json` y `package.json`: configuración para publicación.
