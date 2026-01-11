FROM node:18-alpine

# Build argument für private npm packages
ARG NODE_AUTH_TOKEN

# Setze das Arbeitsverzeichnis
WORKDIR /app

# Installiere Abhängigkeiten
COPY package*.json ./
COPY .npmrc ./
RUN npm install --legacy-peer-deps

# Kopiere den Rest der Dateien
COPY . .

# Baue den TypeScript-Code
RUN npm run build

# Exponiere den Port
EXPOSE 5000

# Startbefehl
CMD ["npm", "start"]