# Política de solo lectura para drf-nextjs-blog
path "secret/data/drf-nextjs-blog/*" {
  capabilities = ["read"]
}

path "secret/metadata/drf-nextjs-blog/*" {
  capabilities = ["read", "list"]
}
