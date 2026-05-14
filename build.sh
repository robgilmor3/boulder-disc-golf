#!/bin/bash
set -e

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "❌ ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in Vercel environment variables"
  exit 1
fi

echo "🔧 Injecting Supabase anon key into index.html..."
sed -i "s|__SUPABASE_ANON_KEY__|${NEXT_PUBLIC_SUPABASE_ANON_KEY}|g" index.html
echo "✅ Build complete — Supabase credentials are live."
