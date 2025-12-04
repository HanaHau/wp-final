#!/bin/bash
set -e

echo "🔧 Generating Prisma Client..."
npx prisma generate

echo "🏗️ Building Next.js application..."
npx next build

echo "✅ Build completed successfully!"

