# Usa una imagen base de Node.js
FROM node:18-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de configuración de paquetes
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto de los archivos de tu proyecto
COPY . .

# Expón el puerto en el que se ejecutará tu aplicación (Next.js usa el puerto 3000 por defecto)
EXPOSE 3000

# Crea un script de shell para ejecutar varios comandos
RUN echo '#!/bin/sh' > start.sh && \
    echo 'npm run build' >> start.sh && \
    echo 'npm run start' >> start.sh && \
    chmod +x start.sh

# Ejecuta el script de shell
CMD ["./start.sh"]