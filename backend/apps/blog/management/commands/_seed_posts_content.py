"""Contenido inicial del blog: categorías y posts (HTML compatible con sanitize_html)."""

CATEGORIES = [
    dict(
        slug="backend",
        name="Backend",
        title="Backend con Python y Django",
        description="APIs, bases de datos, tareas asíncronas y diseño de servicios.",
    ),
    dict(
        slug="devops",
        name="DevOps",
        title="DevOps e infraestructura",
        description="Docker, Nginx, despliegues y operación de servidores propios.",
    ),
    dict(
        slug="seguridad",
        name="Seguridad",
        title="Seguridad en aplicaciones web",
        description="Autenticación, autorización y buenas prácticas para no exponer datos.",
    ),
]

POSTS = [
    dict(
        slug="desplegar-django-nextjs-docker-compose-nginx",
        category="devops",
        featured=True,
        title="Cómo desplegué este blog: Django REST, Next.js y Nginx con Docker Compose",
        description=(
            "El recorrido completo de una petición en producción: TLS en el Nginx del host, "
            "un Nginx propio del proyecto, Next.js, Django con Uvicorn y Celery."
        ),
        keywords="docker compose, nginx, django, nextjs, despliegue",
        content="""
<p>Este blog corre en un VPS que comparte con otros proyectos: un portafolio, un sistema de inventario y varias herramientas internas. La meta era que cada proyecto se pudiera levantar y bajar por separado, sin tocar a los demás, y que todo el despliegue cupiera en un solo <strong>docker compose</strong>.</p>

<h2>El recorrido de una petición</h2>
<p>Cuando abres <a href="https://blog.edqs.online">blog.edqs.online</a>, la petición pasa por estas capas:</p>
<ol>
<li><strong>Nginx del host</strong>: termina TLS con el certificado de Let's Encrypt y reenvía por la red Docker <em>proxy</em>.</li>
<li><strong>blog-nginx</strong>: el Nginx propio del proyecto decide a dónde va cada ruta según el dominio.</li>
<li><strong>Next.js</strong> para las páginas, <strong>Django</strong> para <em>api.blog.edqs.online</em> y <strong>MinIO</strong> para las imágenes.</li>
</ol>
<p>Tener un Nginx por proyecto parece redundante, pero simplifica mucho: el Nginx del host solo conoce un destino por dominio y cada proyecto reparte su tráfico internamente. Si mañana cambio la estructura del blog, no toco la configuración global.</p>

<h2>Redes separadas</h2>
<p>Los contenedores no comparten una red plana. El compose define una red <em>internal</em> para el propio blog y se conecta a redes externas solo donde hace falta:</p>
<ul>
<li><strong>proxy</strong>: únicamente blog-nginx, que es lo único que el host necesita alcanzar.</li>
<li><strong>minio-net</strong>: el backend y blog-nginx, para hablar con el MinIO compartido.</li>
<li><strong>blog-db</strong>: el backend y los workers de Celery, para llegar a PostgreSQL.</li>
</ul>
<p>Así el frontend no puede abrir una conexión a la base de datos aunque quisiera.</p>

<h2>Nginx que arranca aunque falte un servicio</h2>
<p>Un detalle que ahorra dolores de cabeza: si escribes <em>proxy_pass http://blog-frontend:3000</em> directamente, Nginx resuelve el nombre al arrancar y se cae si el contenedor todavía no existe. La solución es usar el DNS de Docker y una variable:</p>
<pre>resolver 127.0.0.11 valid=10s;

location / {
    set $frontend http://blog-frontend:3000;
    proxy_pass $frontend;
}</pre>
<p>Con la variable, el nombre se resuelve en cada petición y Nginx levanta siempre.</p>

<h2>Arranque ordenado con health checks</h2>
<p>El backend aplica migraciones y <em>collectstatic</em> al iniciar, y solo cuando su health check responde arrancan Celery y el frontend. Cada servicio tiene además un límite de memoria, para que un proceso desbocado no se lleve por delante al resto del servidor.</p>

<blockquote>La regla que sigo: el servidor no compila nada que no pueda reconstruir con un solo comando.</blockquote>
""",
    ),
    dict(
        slug="subir-imagenes-minio-urls-firmadas",
        category="backend",
        featured=True,
        title="Subir imágenes directo a MinIO con URLs firmadas desde Django",
        description=(
            "Por qué las imágenes del blog no pasan por Django y cómo firmar URLs contra un "
            "endpoint público distinto del interno."
        ),
        keywords="minio, s3, urls firmadas, boto3, django",
        content="""
<p>Subir un archivo a través del backend es lo más sencillo, pero obliga a Django a recibir el archivo completo, guardarlo en memoria o disco y reenviarlo al almacenamiento. Para imágenes de varios megas es trabajo inútil. En este blog el navegador sube la imagen directamente a MinIO, y Django solo firma el permiso.</p>

<h2>El flujo</h2>
<ol>
<li>El frontend pide una URL firmada para una clave concreta, por ejemplo <em>media/blog/posts/usuario/slug/portada.png</em>.</li>
<li>Django genera una URL <strong>PUT</strong> válida por pocos minutos.</li>
<li>El navegador sube el archivo con esa URL directamente al bucket.</li>
<li>Al guardar el post, solo se envía la clave del objeto, no el archivo.</li>
</ol>
<p>El bucket es privado. Para mostrar una imagen, la API devuelve otra URL firmada, esta vez de lectura y de corta duración.</p>

<h2>El problema de los dos endpoints</h2>
<p>Dentro de Docker, el backend llega a MinIO como <em>http://minio:9000</em>. Pero esa dirección no existe para el navegador. Y la firma S3 incluye el host, así que no basta con reemplazar el dominio en la URL: la firma deja de ser válida.</p>
<p>La solución es tener dos clientes de boto3: uno con el endpoint interno para operaciones del servidor, y otro con el endpoint público solo para firmar. La firma se calcula sin conexión, así que el contenedor no necesita alcanzar el dominio público:</p>
<pre>def get_public_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_PUBLIC_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4",
                      s3={"addressing_style": "path"}),
    )</pre>

<h2>Servir el bucket bajo el mismo dominio</h2>
<p>En producción, el endpoint público es el propio <em>blog.edqs.online</em>. El Nginx del blog reenvía la ruta del bucket a MinIO <strong>sin cambiar el Host ni la URI</strong>, porque ambos forman parte de lo que se firmó. Además desactivo el buffering para que las subidas grandes no se acumulen en Nginx:</p>
<pre>location /drf-nextjs-blog/ {
    set $minio http://minio:9000;
    proxy_pass $minio;
    proxy_set_header Host $host;
    proxy_request_buffering off;
}</pre>
<p>Ventaja extra: al ser el mismo dominio, no hay que configurar CORS para las imágenes.</p>
""",
    ),
    dict(
        slug="minio-postgresql-compartidos-varios-proyectos",
        category="devops",
        featured=False,
        title="Un MinIO y un PostgreSQL para varios proyectos sin mezclar datos",
        description=(
            "Cómo comparto almacenamiento y base de datos entre proyectos del mismo servidor, "
            "con un bucket, una base y un usuario por proyecto."
        ),
        keywords="minio, postgresql, multi proyecto, permisos, vps",
        content="""
<p>En un VPS pequeño no tiene sentido levantar un MinIO y un PostgreSQL por cada proyecto: cada instancia consume memoria aunque esté casi vacía. Pero compartirlos sin cuidado significa que un proyecto con un fallo puede leer o borrar datos de otro. El punto medio es compartir el servicio y aislar las credenciales.</p>

<h2>MinIO: un bucket y un usuario por proyecto</h2>
<p>Hay un solo contenedor de MinIO, en la red <em>minio-net</em>. Cada proyecto tiene:</p>
<ul>
<li>Su propio <strong>bucket</strong>, privado.</li>
<li>Su propio <strong>usuario</strong>, con una política que solo permite operar sobre ese bucket.</li>
</ul>
<p>La política es corta: permisos de lectura, escritura y listado limitados al ARN del bucket del proyecto. Las credenciales root de MinIO no salen nunca del servidor y ningún proyecto las conoce.</p>

<h2>PostgreSQL: una base y un rol por proyecto</h2>
<p>Con la base de datos hago lo mismo: cada proyecto tiene su base y un rol que solo es dueño de esa base. Además, cada proyecto se conecta por una red Docker dedicada, en este caso <em>blog-db</em>, de modo que los contenedores de otros proyectos ni siquiera ven el puerto. La creación es algo así:</p>
<pre>CREATE ROLE blog LOGIN PASSWORD '...';
CREATE DATABASE drf_nextjs_blog OWNER blog;
REVOKE ALL ON DATABASE drf_nextjs_blog FROM PUBLIC;</pre>

<h2>Qué gano y qué pierdo</h2>
<ul>
<li><strong>Gano</strong> memoria, un solo sitio que mantener y actualizar, y backups centralizados.</li>
<li><strong>Pierdo</strong> aislamiento total: si el servicio compartido cae, caen todos los proyectos. Para un servidor personal es un intercambio razonable.</li>
</ul>
<blockquote>Compartir infraestructura está bien; compartir credenciales, no.</blockquote>
""",
    ),
    dict(
        slug="autenticacion-jwt-otp-django-rest-djoser",
        category="seguridad",
        featured=False,
        title="Autenticación con JWT y OTP en Django REST Framework",
        description=(
            "Registro con activación por correo, JWT con SimpleJWT, segundo factor con códigos "
            "OTP y protección contra fuerza bruta con django-axes."
        ),
        keywords="jwt, otp, djoser, simplejwt, django axes",
        content="""
<p>La autenticación es la parte de un proyecto que menos conviene improvisar. En este blog uso piezas probadas y me limito a unirlas: <strong>djoser</strong> para el flujo de cuentas, <strong>SimpleJWT</strong> para los tokens y <strong>django-axes</strong> para frenar ataques de fuerza bruta.</p>

<h2>El ciclo de vida de una cuenta</h2>
<ol>
<li>El usuario se registra y la cuenta queda inactiva.</li>
<li>Recibe un correo con un enlace de activación que apunta al frontend, no a la API.</li>
<li>El frontend envía el uid y el token a la API, que activa la cuenta.</li>
<li>Desde ahí puede iniciar sesión y, si lo olvida, recuperar la contraseña con el mismo patrón.</li>
</ol>
<p>Que los enlaces apunten al frontend es importante: el usuario nunca ve una respuesta JSON cruda y la API no necesita plantillas HTML para estas pantallas.</p>

<h2>JWT con rotación y lista negra</h2>
<p>SimpleJWT emite un token de acceso y uno de refresco. Con <em>ROTATE_REFRESH_TOKENS</em> cada renovación entrega un refresco nuevo, y la app <em>token_blacklist</em> invalida el anterior: un refresco robado deja de servir en cuanto el usuario legítimo renueva su sesión. La duración de los tokens es un equilibrio entre comodidad y riesgo, y conviene acortarla cuanto más sensible sea la aplicación.</p>

<h2>Segundo factor con OTP</h2>
<p>El usuario puede activar un segundo factor escaneando un código QR con su aplicación de autenticación. Desde entonces, además de la contraseña, el login pide el código de 6 dígitos que cambia cada 30 segundos. El secreto se guarda en el servidor y el QR solo se muestra al configurarlo.</p>

<h2>Fuerza bruta</h2>
<p>django-axes registra los intentos fallidos por usuario e IP y bloquea temporalmente tras varios errores. Detrás de un proxy hay que asegurarse de que Django lea la IP real del cliente desde las cabeceras reenviadas; si no, todos los intentos parecen venir del propio Nginx y se termina bloqueando a todo el mundo a la vez.</p>
<blockquote>Una buena autenticación es aburrida: piezas conocidas, tokens que caducan y límites a los intentos.</blockquote>
""",
    ),
    dict(
        slug="tareas-segundo-plano-celery-redis-django",
        category="backend",
        featured=False,
        title="Tareas en segundo plano con Celery y Redis en Django",
        description=(
            "Qué mover fuera de la petición HTTP, cómo separar worker y beat, y cómo acumular "
            "métricas en Redis antes de escribirlas en la base de datos."
        ),
        keywords="celery, redis, django, tareas asincronas, celery beat",
        content="""
<p>Una petición HTTP debería responder rápido. Todo lo que no necesita el usuario en ese momento, como enviar un correo o recalcular métricas, se puede hacer después. En este blog eso lo resuelven <strong>Celery</strong> y <strong>Redis</strong>.</p>

<h2>Worker y beat, contenedores distintos</h2>
<p>El compose levanta dos procesos de Celery a partir de la misma imagen del backend:</p>
<ul>
<li><strong>celery-worker</strong>: ejecuta las tareas que llegan a la cola.</li>
<li><strong>celery-beat</strong>: programa las tareas periódicas y las encola a su hora.</li>
</ul>
<p>Separarlos permite reiniciar o escalar el worker sin duplicar el planificador. Si beat corriera dos veces, cada tarea periódica se ejecutaría dos veces.</p>

<h2>Métricas sin escribir en cada visita</h2>
<p>Contar impresiones con un <em>UPDATE</em> por cada visita genera muchas escrituras pequeñas y bloqueos sobre la misma fila. En su lugar, cada impresión incrementa un contador en Redis, que es una operación atómica y muy barata:</p>
<pre>redis_client.incr(f"post:impressions:{post.id}")</pre>
<p>Una tarea periódica, <em>sync_impressions_to_db</em>, recorre esos contadores, suma los valores a la tabla de analíticas en una sola escritura por post y los reinicia. La base recibe pocas escrituras grandes en lugar de miles de pequeñas.</p>

<h2>El planificador en la base de datos</h2>
<p>Uso <em>django-celery-beat</em> con el planificador en base de datos. Así puedo ver, activar o cambiar la frecuencia de las tareas periódicas desde el admin de Django, sin redesplegar.</p>

<h2>Lo que conviene vigilar</h2>
<ul>
<li>Las tareas deben ser <strong>idempotentes</strong>: si una se ejecuta dos veces, el resultado no debería cambiar.</li>
<li>El worker necesita su propio límite de memoria; una tarea con fugas no debe afectar a la API.</li>
<li>Una tarea programada que nunca se registra no falla: simplemente no ocurre. Hay que comprobar que está en la lista de tareas periódicas.</li>
</ul>
""",
    ),
]
