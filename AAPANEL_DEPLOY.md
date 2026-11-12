# 🚀 Guía de Despliegue en aaPanel (VPS) - EDV Monitor (Panel Web)

Esta guía explica paso a paso cómo desplegar el **Panel Web Administrativo** de **Empresas del Valle** en tu VPS administrado con **aaPanel**.

---

## ⚡ Método 1: Sitio Web Estático (Recomendado - Ultra Rápido y Bajo Consumo de RAM)

Dado que el Panel Web está compilado en la carpeta `dist/`, el servidor web (Nginx o Apache) de aaPanel lo sirve directamente con consumo casi nulo de recursos.

### Pasos en aaPanel:

1. **Clonar o Subir el Proyecto**:
   - En tu VPS, mediante SSH o la terminal de aaPanel:
     ```bash
     cd /www/wwwroot
     git clone https://github.com/DervisMartinez/monitor-edv.git
     cd monitor-edv
     ```
   - Si no compilas en el VPS, la carpeta `dist/` ya viene lista. Si deseas compilarla en el VPS:
     ```bash
     npm install
     npm run build
     ```

2. **Crear el Sitio Web en aaPanel**:
   - Ve a **Website** -> **Add site**.
   - **Domain**: Tu subdominio o IP (ej. `panel.empresasdelvalle.com` o `tu-ip:8081`).
   - **Site Directory**: `/www/wwwroot/monitor-edv`
   - **Running Directory (Document Root)**: Selecciona `/dist` (es decir: `/www/wwwroot/monitor-edv/dist`).
   - Haz clic en **Submit**.

3. **Configurar Regla de Reescritura Nginx (SPA URL Rewrite)**:
   - Haz clic en el nombre del sitio web recién creado -> **URL Rewrite**.
   - Agrega la siguiente directiva para que las rutas de React Native Web / Expo Router funcionen al recargar la página:
     ```nginx
     location / {
         try_files $uri $uri/ /index.html;
     }
     ```
   - Haz clic en **Save**.

4. **SSL / HTTPS (Opcional)**:
   - En la pestaña **SSL** -> **Let's Encrypt**, activa tu certificado SSL gratuito.

---

## 🟢 Método 2: Node.js Project Manager en aaPanel

Si prefieres ejecutar el servidor Node.js independiente (`server.js`) escuchando en el puerto `8081`:

1. En aaPanel, ve a **App Store** -> busca e instala **Node.js Project Manager** (si no lo tienes).
2. Abre **Node.js Project Manager** -> **Add Project**:
   - **Path**: `/www/wwwroot/monitor-edv`
   - **Name**: `edv-monitor-web`
   - **Run Opt**: `server.js`
   - **Port**: `8081`
   - **Node Version**: v18+ o v20+
3. Haz clic en **Submit**.
4. ¡Listo! El servidor levantará en el puerto `8081` sirviendo la aplicación.

---

## 🔐 Configuración de Entorno (.env)

En tu VPS, copia el archivo de ejemplo y coloca tus credenciales reales:
```bash
cp .env.example .env
nano .env
```

Configura tus credenciales de Supabase en `.env` antes de compilar o iniciar el servidor.
