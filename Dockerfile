FROM node:18

# Setze das Arbeitsverzeichnis
WORKDIR /app

# Installiere Abhängigkeiten
COPY package*.json ./
RUN npm install

# Kopiere den Rest der Dateien
COPY . .

# Baue den TypeScript-Code
RUN npm run build

# Exponiere den Port
EXPOSE 5000

# Startbefehl
CMD ["npm", "start"]
