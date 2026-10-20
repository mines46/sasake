# syntax=docker/dockerfile:1

# -------------------------------------------------------------
# Stage 1: Build Frontend (Vite + React + Tailwind)
# -------------------------------------------------------------
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ ./
# VITE_API_URL defaults to /api for relative same-origin API calls
ENV VITE_API_URL=/api
RUN npm run build

# -------------------------------------------------------------
# Stage 2: Build Backend (Go 1.25)
# -------------------------------------------------------------
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/sasake-server .

# -------------------------------------------------------------
# Stage 3: Minimal Production Runtime
# -------------------------------------------------------------
FROM alpine:3.21
WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata
ENV TZ=Europe/Madrid

COPY --from=backend-builder /app/sasake-server /app/sasake-server
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist
COPY database/ /app/database/

EXPOSE 8080
ENV PORT=8080
ENV ENV=production

CMD ["/app/sasake-server"]

