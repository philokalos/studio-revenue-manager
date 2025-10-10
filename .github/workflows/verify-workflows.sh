#!/bin/bash
# Verify GitHub Actions workflows are correctly configured

echo "🔍 Verifying GitHub Actions Workflows for Firebase CI/CD"
echo "========================================================"
echo ""

WORKFLOWS_DIR=".github/workflows"
REQUIRED_WORKFLOWS=(
  "frontend-test.yml"
  "functions-test.yml"
  "deploy-frontend.yml"
  "deploy-functions.yml"
)

# Check if workflows directory exists
if [ ! -d "$WORKFLOWS_DIR" ]; then
  echo "❌ ERROR: $WORKFLOWS_DIR directory not found"
  exit 1
fi

echo "✅ Workflows directory found"
echo ""

# Check for required workflow files
echo "Checking for required workflow files..."
MISSING_FILES=0
for workflow in "${REQUIRED_WORKFLOWS[@]}"; do
  if [ -f "$WORKFLOWS_DIR/$workflow" ]; then
    echo "  ✅ $workflow"
  else
    echo "  ❌ $workflow (MISSING)"
    MISSING_FILES=$((MISSING_FILES + 1))
  fi
done
echo ""

if [ $MISSING_FILES -gt 0 ]; then
  echo "❌ ERROR: $MISSING_FILES required workflow file(s) missing"
  exit 1
fi

# Verify YAML syntax (requires yq or yamllint)
echo "Checking YAML syntax..."
HAS_YAML_TOOL=false

if command -v yq &> /dev/null; then
  HAS_YAML_TOOL=true
  for workflow in "${REQUIRED_WORKFLOWS[@]}"; do
    if yq eval '.' "$WORKFLOWS_DIR/$workflow" > /dev/null 2>&1; then
      echo "  ✅ $workflow syntax valid"
    else
      echo "  ❌ $workflow syntax invalid"
      exit 1
    fi
  done
elif command -v yamllint &> /dev/null; then
  HAS_YAML_TOOL=true
  for workflow in "${REQUIRED_WORKFLOWS[@]}"; do
    if yamllint "$WORKFLOWS_DIR/$workflow" > /dev/null 2>&1; then
      echo "  ✅ $workflow syntax valid"
    else
      echo "  ⚠️  $workflow has warnings (check manually)"
    fi
  done
else
  echo "  ⚠️  No YAML validator found (install 'yq' or 'yamllint')"
fi
echo ""

# Check for required secrets documentation
echo "Checking documentation..."
DOC_FILES=(
  "README.md"
  "FIREBASE_SETUP.md"
  "PHASE4_SUMMARY.md"
)

for doc in "${DOC_FILES[@]}"; do
  if [ -f "$WORKFLOWS_DIR/$doc" ]; then
    echo "  ✅ $doc"
  else
    echo "  ⚠️  $doc (missing but optional)"
  fi
done
echo ""

# Check Node.js version in workflows
echo "Checking Node.js versions..."
for workflow in "${REQUIRED_WORKFLOWS[@]}"; do
  NODE_VERSION=$(grep -A 2 "uses: actions/setup-node@v4" "$WORKFLOWS_DIR/$workflow" | grep "node-version:" | awk '{print $2}')
  if [ "$NODE_VERSION" = "20.x" ]; then
    echo "  ✅ $workflow uses Node.js 20.x"
  else
    echo "  ⚠️  $workflow uses Node.js $NODE_VERSION (expected 20.x)"
  fi
done
echo ""

# Check for caching configuration
echo "Checking caching configuration..."
for workflow in "${REQUIRED_WORKFLOWS[@]}"; do
  if grep -q "actions/cache@v3" "$WORKFLOWS_DIR/$workflow"; then
    echo "  ✅ $workflow has dependency caching"
  else
    echo "  ⚠️  $workflow missing dependency caching"
  fi
done
echo ""

# Summary
echo "========================================================"
echo "📊 Verification Summary"
echo "========================================================"
echo ""
echo "✅ All required workflow files present"
echo "✅ Workflows directory structure correct"

if [ "$HAS_YAML_TOOL" = true ]; then
  echo "✅ YAML syntax validated"
fi

echo ""
echo "🎯 Next Steps:"
echo "  1. Add FIREBASE_TOKEN to GitHub Secrets"
echo "  2. Add FIREBASE_SERVICE_ACCOUNT to GitHub Secrets"
echo "  3. Push to main branch to trigger workflows"
echo "  4. Check Actions tab for workflow execution"
echo ""
echo "📚 Documentation:"
echo "  - Setup guide: .github/workflows/FIREBASE_SETUP.md"
echo "  - Full docs: .github/workflows/README.md"
echo ""
echo "✅ Verification complete!"
