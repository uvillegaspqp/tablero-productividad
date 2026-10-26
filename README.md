# Tablero de productividad — versión gratuita

Aplicación web React + Vite para registrar y dar seguimiento a actividades. Esta versión no requiere Base44 ni una base de datos pagada: guarda la información en el almacenamiento local del navegador (`localStorage`).

## Funciones
- Crear, editar y eliminar actividades.
- Estados automáticos: En curso, Retrasada y Finalizada.
- Indicadores de actividades, cumplimiento, puntualidad y promedio de cierre.
- Seguimiento por cubo y responsable.
- Próximas actividades a vencer.
- Búsqueda y filtros por estado, cubo y planta.
- Selección de planta en cada actividad: PL BARRANQUILLA, PL MUÑA, PL JAMUNDÍ, PL GIRARDOTA, TODAS o N/A.
- Indicadores de avance y tiempo promedio de cierre por responsable.
- Acceso con contraseña a Configuración.
- Exportación CSV compatible con Excel.
- Exportar e importar una copia de seguridad JSON.

## Ejecutar localmente
1. Instalar Node.js LTS desde https://nodejs.org/
2. Descomprimir esta carpeta.
3. Abrir una terminal en la carpeta del proyecto.
4. Ejecutar:
   ```bash
   npm install
   npm run dev
   ```
5. Abrir la dirección local que muestre Vite (normalmente `http://localhost:5173`).

## Publicarla gratis en internet con Netlify
1. Crear una cuenta gratuita en https://www.netlify.com/
2. Crear un repositorio en GitHub y subir el contenido de esta carpeta.
3. En Netlify, seleccionar **Add new site / Import an existing project** y conectar el repositorio.
4. Configuración:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Pulsar **Deploy**. Netlify generará una URL pública HTTPS.

Nota: la contraseña de Configuración está validada en el cliente; sirve como barrera de interfaz, pero no es un mecanismo de seguridad robusto para información sensible.

También se puede publicar en Vercel o Cloudflare Pages usando `npm run build` y la carpeta `dist`.

## Importante sobre los datos
Esta versión guarda los registros en el navegador y dispositivo donde se usan. No comparte automáticamente datos entre usuarios ni equipos, y los datos pueden perderse si se borra el almacenamiento del navegador. Utiliza **Exportar respaldo** periódicamente. Para uso colaborativo multiusuario se debe conectar una base de datos/autenticación; un servicio gratuito como Supabase puede ser una siguiente etapa.
