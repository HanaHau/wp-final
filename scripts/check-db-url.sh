#!/bin/bash
# 檢查 DATABASE_URL 格式的腳本

echo "檢查 DATABASE_URL 格式..."

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL 未設置"
  exit 1
fi

# 檢查是否以 postgresql:// 或 postgres:// 開頭
if [[ ! "$DATABASE_URL" =~ ^postgres(ql)?:// ]]; then
  echo "❌ DATABASE_URL 必須以 postgresql:// 或 postgres:// 開頭"
  echo "當前值: ${DATABASE_URL:0:50}..."
  exit 1
fi

# 檢查是否包含端口 6543（Session Pooler）
if [[ ! "$DATABASE_URL" =~ :6543/ ]]; then
  echo "⚠️  警告: DATABASE_URL 可能未使用端口 6543（Session Pooler）"
fi

# 檢查是否包含必要的參數
if [[ ! "$DATABASE_URL" =~ sslmode=require ]]; then
  echo "⚠️  警告: DATABASE_URL 可能缺少 sslmode=require"
fi

if [[ ! "$DATABASE_URL" =~ pgbouncer=true ]]; then
  echo "⚠️  警告: DATABASE_URL 可能缺少 pgbouncer=true"
fi

echo "✅ DATABASE_URL 格式檢查通過"
echo "格式: ${DATABASE_URL:0:80}..."

