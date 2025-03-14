FROM node:18-alpine

# Setze das Arbeitsverzeichnis
WORKDIR /app

# Installiere Abhängigkeiten
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Kopiere den Rest der Dateien
COPY . .

# Baue den TypeScript-Code
RUN npm run build

# Exponiere den Port
EXPOSE 5000

# Startbefehl
CMD ["npm", "start"]