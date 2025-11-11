# Basis-Image
FROM node:23-alpine

# Arbeitsverzeichnis im Container
WORKDIR /app

# Paketdefinition kopieren und Abhängigkeiten installieren
COPY package*.json ./

# Nur für Entwicklungszwecke: falls du Prisma CLI etc. als devDependencies installiert hast
RUN npm install

COPY prisma ./prisma
# Projektdateien kopieren
COPY . .

# Prisma Client generieren (wenn du `prisma generate` brauchst)
RUN npx prisma generate

# Prisma init (optional, wenn du das brauchst)
RUN npx prisma db push

# Standardport
EXPOSE 3000

# Startbefehl für den Server
CMD ["node", "server.js"]