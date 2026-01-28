#!/bin/bash
# Test rápido del filtro editorial mejorado

set -e

echo "🧪 Ejecutando tests del filtro editorial..."
echo ""

cd "$(dirname "$0")"

# Verificar que existe API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "⚠️  ADVERTENCIA: ANTHROPIC_API_KEY no está configurada"
  echo "   Los tests no se ejecutarán correctamente sin API key"
  echo ""
  echo "   Para configurarla:"
  echo "   export ANTHROPIC_API_KEY='tu-api-key'"
  echo ""
  exit 1
fi

# Compilar TypeScript si es necesario
if [ ! -d "dist" ]; then
  echo "📦 Compilando TypeScript..."
  npm run build
  echo ""
fi

# Ejecutar tests
echo "🚀 Ejecutando test-filtro-editorial.ts..."
echo ""

node --loader ts-node/esm test-filtro-editorial.ts

echo ""
echo "✅ Tests completados"
