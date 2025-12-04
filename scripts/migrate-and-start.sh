#!/bin/bash
set -e

echo "🔄 Running database migrations..."
npx prisma migrate deploy || echo "⚠️ Migration failed, continuing anyway..."

echo "🚀 Starting application..."
exec npm start

