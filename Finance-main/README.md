# 📱 Organizador de Finanzas Personal - PWA v2.4.0

¡Tu app de finanzas ahora es instalable como PWA!

## 📦 Archivos Incluidos

✅ `index.html` - Página principal actualizada con registro de Service Worker
✅ `manifest.json` - Configuración de la PWA
✅ `sw.js` - Service Worker para funcionalidad offline
✅ `icon-192.png` - Ícono 192x192px
✅ `icon-512.png` - Ícono 512x512px

## 🚀 Cómo Deployar en GitHub Pages

### Opción 1: Reemplazar archivos existentes

1. Ve a tu repositorio en GitHub
2. Reemplaza estos archivos:
   - `index.html` → Con el nuevo
   - Sube los nuevos: `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`
3. Espera 1-2 minutos a que GitHub Pages se actualice

### Opción 2: GitHub Desktop / Git CLI

```bash
# Copiar archivos a tu carpeta del proyecto
cp -r PWA_v2.4/* /ruta/a/tu/proyecto/

# Commit y push
git add .
git commit -m "🚀 v2.4.0 - PWA instalable activada"
git push origin main
```

## 📱 Cómo Instalar en el Móvil

### iPhone/iPad (Safari)

1. Abre tu app en Safari: `https://tu-usuario.github.io/tu-repo`
2. Toca el botón **Compartir** 🔗 (abajo en el centro)
3. Scroll hacia abajo
4. Toca **"Agregar a pantalla de inicio"**
5. Toca **"Agregar"**
6. ¡Listo! El ícono aparecerá en tu pantalla de inicio

### Android (Chrome)

1. Abre tu app en Chrome: `https://tu-usuario.github.io/tu-repo`
2. Verás un banner **"Instalar app"** automáticamente
3. O toca el menú ⋮ (arriba derecha)
4. Selecciona **"Instalar aplicación"** o **"Agregar a pantalla de inicio"**
5. Confirma
6. ¡Listo! La app se instalará

## ✨ Nuevas Características PWA

### ⚡ Funciona Offline
- Tus datos quedan guardados localmente
- Puedes revisar tus finanzas sin internet
- Se carga instantáneamente

### 🎨 Modo Standalone
- Se abre sin la barra del navegador
- Experiencia de app nativa
- Ícono propio en tu teléfono

### 🔄 Auto-actualización
- El Service Worker verifica actualizaciones cada 30 segundos
- Se actualiza automáticamente en segundo plano

## 🧪 Cómo Probar Localmente

```bash
# Si tienes Python 3 instalado:
python3 -m http.server 8000

# O con Node.js:
npx http-server -p 8000

# Luego abre: http://localhost:8000
```

**IMPORTANTE:** Para probar PWA localmente, debes usar HTTPS o localhost. GitHub Pages ya tiene HTTPS automáticamente.

## 🔍 Verificar que Funciona

1. **Chrome DevTools:**
   - F12 → Pestaña "Application"
   - Ver "Service Workers" (debe aparecer registrado)
   - Ver "Manifest" (debe cargar correctamente)

2. **Safari iOS:**
   - Si aparece "Agregar a pantalla de inicio" → ✅ Funciona
   - Si el ícono se instala correctamente → ✅ Todo bien

3. **Chrome Android:**
   - Si aparece el banner "Instalar app" → ✅ Funciona

## 📋 Changelog v2.4.0

### ✨ Nuevo
- 📱 PWA completamente instalable
- ⚡ Service Worker para funcionalidad offline
- 🎨 Íconos personalizados (192x192 y 512x512)
- 🔄 Auto-actualización en segundo plano
- 📦 Manifest.json con configuración completa

### 🔧 Mejorado
- Manifest ahora es archivo separado (mejor mantenimiento)
- Apple Touch Icon agregado para iOS
- Theme color optimizado (#667eea)

## ❓ Solución de Problemas

### No aparece el prompt de instalación
- **Verifica HTTPS:** Debe estar en GitHub Pages o localhost
- **Revisa Service Worker:** En DevTools → Application → Service Workers
- **Limpia caché:** DevTools → Application → Clear Storage

### El ícono no se ve bien
- Los archivos `icon-192.png` y `icon-512.png` deben estar en la raíz
- Verifica que el `manifest.json` apunte a ellos correctamente

### Error al cargar Service Worker
- Verifica que `sw.js` esté en la raíz del proyecto
- El path en `navigator.serviceWorker.register('/sw.js')` debe ser correcto

## 📧 Contacto

**Creado por:** Ismael  
**Email:** bigio_tec@me.com  
**Google Analytics:** G-21XPVF0G1Q  

---

## 🎯 Próximos Pasos

1. ✅ Deploy en GitHub Pages
2. ✅ Instalar en tu móvil
3. ✅ Compartir con amigos/familia
4. 🔮 Futuro: Notificaciones push para recordatorios de pagos

¡Disfruta tu nueva PWA! 🚀
