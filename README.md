# drf-nextjs-blog

Plataforma de blog full stack con **Django REST Framework** en el backend y **Next.js** en el frontend.

## Funcionalidades

- **Autenticación**: registro, activación por correo, login con JWT, recuperación de contraseña, verificación en dos pasos por correo y login con Google y GitHub (djoser + SimpleJWT + social-auth, protección de fuerza bruta con django-axes).
- **Blog**: posts con editor enriquecido, categorías, encabezados, likes, búsqueda y analíticas de vistas e interacciones.
- **Perfiles de usuario**: foto de perfil, banner, biografía y redes sociales; página pública por usuario (`/@usuario`).
- **Media**: subida de imágenes directamente al almacenamiento S3 compatible (MinIO o AWS S3) mediante URLs firmadas.
- **Newsletter y contacto**.
- **Tareas en segundo plano** con Celery y Celery Beat.

## Tecnologías

| Capa | Stack |
|---|---|
| Backend | Python 3.9, Django 4.2, Django REST Framework, Channels, Celery, Uvicorn |
| Frontend | Next.js 15, React 19, Redux Toolkit, Tailwind CSS, TipTap |
| Datos | PostgreSQL, Redis |
| Archivos | MinIO (S3 compatible) o AWS S3 + CloudFront |

## Estructura

```
drf-nextjs-blog/
├── backend/              # API Django
│   ├── apps/             # authentication, blog, media, newsletter, user_profile
│   ├── core/             # settings, urls, celery, storage
│   └── utils/
├── frontend/             # App Next.js (pages router)
│   └── src/
├── tailwind_components/  # Componentes HTML/Tailwind de referencia
├── deploy/nginx/         # Configuración de nginx para producción
├── docker-compose.yml       # Desarrollo
└── docker-compose.prod.yml  # Producción
```

## Levantar con Docker

El `docker-compose.yml` levanta **backend, Celery worker, Celery beat, Redis y frontend**.
**PostgreSQL y MinIO corren como contenedores fuera del compose.**

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend / admin | http://localhost:8020 · http://localhost:8020/admin/ |
| MinIO API | http://localhost:9020 |
| MinIO consola | http://localhost:9021 |

### 1. Variables de entorno

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Completa los valores. Ten en cuenta que:

- `VALID_API_KEYS` (backend) y `BACKEND_API_KEY` (frontend) deben coincidir.
- Las credenciales de MinIO (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) deben ser las mismas en ambos archivos.

### 2. PostgreSQL

El backend se conecta a un contenedor de PostgreSQL existente publicado en el puerto `5432` del host,
a través de `host.docker.internal`. Crea la base de datos una sola vez:

```bash
docker exec -it postgres psql -U postgres -c "CREATE DATABASE drf_nextjs_blog;"
```

### 3. MinIO

Crea la red compartida y el contenedor de MinIO, con las mismas credenciales del `.env`:

```bash
docker network create blog-minio-net

docker run -d --name blog-minio --restart unless-stopped \
  --network blog-minio-net \
  -p 9020:9000 -p 9021:9001 \
  -e MINIO_ROOT_USER=<AWS_ACCESS_KEY_ID> \
  -e MINIO_ROOT_PASSWORD=<AWS_SECRET_ACCESS_KEY> \
  -v blog-minio-data:/data \
  pgsty/minio:RELEASE.2026-08-04T00-00-00Z server /data --console-address ":9001"
```

Si ya tienes un MinIO con otro nombre, conéctalo a la red y ajusta `AWS_S3_ENDPOINT_URL`:

```bash
docker network connect blog-minio-net <contenedor-minio>
```

El servicio `minio-init` del compose crea el bucket automáticamente. El bucket es privado:
las imágenes se suben y se leen con URLs firmadas.

### 4. Levantar

```bash
docker compose up -d --build
docker compose exec backend python manage.py createsuperuser
```

Al iniciar, el backend aplica las migraciones y ejecuta `collectstatic`.

Para cargar las categorías y los posts iniciales (idempotente; `--refresh` restaura el contenido versionado):

```bash
docker compose exec backend python manage.py seed_posts --author <usuario>
```

## Producción

El despliegue en el VPS usa `docker-compose.prod.yml`, con el frontend compilado (`next build`), Uvicorn sin recarga y un nginx propio (`blog-nginx`) que reparte el tráfico:

| URL | Destino |
|---|---|
| `https://blog.edqs.online` | Frontend (Next.js) |
| `https://blog.edqs.online/<bucket>/...` | MinIO (imágenes con URL firmada) |
| `https://api.blog.edqs.online` | Backend (API y admin de Django) |

El nginx del host termina TLS y reenvía ambos subdominios a `blog-nginx` por la red `proxy`
(bloque de ejemplo en `deploy/nginx/edqs-blog.host.conf`). PostgreSQL y MinIO son compartidos
y se alcanzan por las redes externas `blog-db` y `minio-net`.

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Variables a ajustar en producción (`backend/.env`):
`DEBUG=False`, `USE_X_FORWARDED_PROTO=True`, `ALLOWED_HOSTS`, `CORS_ORIGIN_WHITELIST`, `CSRF_TRUSTED_ORIGINS`,
`FRONTEND_DOMAIN`, `AWS_S3_ENDPOINT_URL=http://minio:9000` y `AWS_S3_PUBLIC_ENDPOINT_URL=https://blog.edqs.online`.

## Configuración del almacenamiento

El backend usa **MinIO** cuando `AWS_S3_ENDPOINT_URL` está definido, y **AWS S3 + CloudFront** en caso contrario.

| Variable | Uso |
|---|---|
| `AWS_S3_ENDPOINT_URL` | Dirección interna de MinIO, usada por Django (ej. `http://blog-minio:9000`) |
| `AWS_S3_PUBLIC_ENDPOINT_URL` | Dirección que usa el navegador; va dentro de las URLs firmadas (ej. `http://localhost:9020`). En un servidor, usa el dominio o IP real |
| `AWS_STORAGE_BUCKET_NAME` | Nombre del bucket |
| `AWS_QUERYSTRING_EXPIRE` | Duración de las URLs firmadas, en segundos |

## Notas de desarrollo

- El código se monta como volumen: los cambios en backend y frontend se recargan solos.
- Si cambias `frontend/package.json`, reconstruye y elimina el volumen de dependencias:

  ```bash
  docker compose down
  docker volume rm drf-nextjs-blog_frontend-node-modules
  docker compose up -d --build
  ```

- Ver logs: `docker compose logs -f backend` (o `frontend`, `celery-worker`, `celery-beat`).
