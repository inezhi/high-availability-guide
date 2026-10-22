#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
REPO_NAME="${1:-high-availability-guide}"

if command -v python3 >/dev/null 2>&1 && [ -f tools/build.py ]; then
  python3 tools/build.py
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "未找到 GitHub CLI。请先执行：brew install gh"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "尚未登录 GitHub。请先执行：gh auth login"
  exit 1
fi

gh auth setup-git

OWNER="$(gh api user --jq .login)"
NAME="$(gh api user --jq '.name // .login')"
EMAIL="$(gh api user --jq '.email // (.login + "@users.noreply.github.com")')"

git config user.name "$NAME"
git config user.email "$EMAIL"

if [ ! -d .git ]; then
  git init -b main
fi

git add -A
if ! git diff --cached --quiet; then
  git commit -m "Add multi-page interactive high-availability guide

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
fi

if gh repo view "$OWNER/$REPO_NAME" >/dev/null 2>&1; then
  if git remote get-url origin >/dev/null 2>&1; then
    git remote set-url origin "https://github.com/$OWNER/$REPO_NAME.git"
  else
    git remote add origin "https://github.com/$OWNER/$REPO_NAME.git"
  fi
  git push -u origin main
else
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push \
    --description "高可用架构 · 交互式图解"
fi

if ! gh api "repos/$OWNER/$REPO_NAME/pages" >/dev/null 2>&1; then
  if ! gh api --method POST "repos/$OWNER/$REPO_NAME/pages" \
    -f "source[branch]=main" -f "source[path]=/"; then
    gh api --method POST "repos/$OWNER/$REPO_NAME/pages" --input - <<'JSON'
{"source":{"branch":"main","path":"/"}}
JSON
  fi
fi

echo ""
echo "已发布：https://$OWNER.github.io/$REPO_NAME/"
echo "GitHub Pages 首次构建通常需要一到两分钟。"
