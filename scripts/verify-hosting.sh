#!/bin/bash

# Firebase Hosting Verification Script
# Checks that all required configuration is in place before deployment

set -e

echo "🔍 Firebase Hosting Configuration Verification"
echo "=============================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check if we're in the project root
if [ ! -f "firebase.json" ]; then
    echo -e "${RED}❌ Error: firebase.json not found. Run this script from project root.${NC}"
    exit 1
fi

echo "1. Checking Firebase Configuration Files..."
echo "-------------------------------------------"

# Check firebase.json
if [ -f "firebase.json" ]; then
    echo -e "${GREEN}✓${NC} firebase.json exists"

    # Check if hosting is configured
    if grep -q '"hosting"' firebase.json; then
        echo -e "${GREEN}✓${NC} Hosting configuration found"
    else
        echo -e "${RED}✗${NC} Hosting configuration missing in firebase.json"
        ((ERRORS++))
    fi

    # Check if public directory is set correctly
    if grep -q '"public": "packages/frontend/dist"' firebase.json; then
        echo -e "${GREEN}✓${NC} Public directory configured correctly"
    else
        echo -e "${YELLOW}⚠${NC} Public directory may not be configured correctly"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}✗${NC} firebase.json not found"
    ((ERRORS++))
fi

# Check .firebaserc
if [ -f ".firebaserc" ]; then
    echo -e "${GREEN}✓${NC} .firebaserc exists"
else
    echo -e "${RED}✗${NC} .firebaserc not found"
    ((ERRORS++))
fi

echo ""
echo "2. Checking Frontend Configuration..."
echo "-------------------------------------"

# Check if frontend directory exists
if [ -d "packages/frontend" ]; then
    echo -e "${GREEN}✓${NC} Frontend directory exists"
else
    echo -e "${RED}✗${NC} Frontend directory not found"
    ((ERRORS++))
    exit 1
fi

# Check vite.config.ts
if [ -f "packages/frontend/vite.config.ts" ]; then
    echo -e "${GREEN}✓${NC} vite.config.ts exists"
else
    echo -e "${RED}✗${NC} vite.config.ts not found"
    ((ERRORS++))
fi

# Check package.json
if [ -f "packages/frontend/package.json" ]; then
    echo -e "${GREEN}✓${NC} package.json exists"

    # Check build script
    if grep -q '"build"' packages/frontend/package.json; then
        echo -e "${GREEN}✓${NC} Build script configured"
    else
        echo -e "${RED}✗${NC} Build script missing"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗${NC} package.json not found"
    ((ERRORS++))
fi

echo ""
echo "3. Checking Environment Configuration..."
echo "----------------------------------------"

# Check .env.example
if [ -f "packages/frontend/.env.example" ]; then
    echo -e "${GREEN}✓${NC} .env.example exists"
else
    echo -e "${YELLOW}⚠${NC} .env.example not found (recommended)"
    ((WARNINGS++))
fi

# Check .env.production
if [ -f "packages/frontend/.env.production" ]; then
    echo -e "${GREEN}✓${NC} .env.production exists"

    # Check if Firebase variables are set
    if grep -q "VITE_FIREBASE_API_KEY=" packages/frontend/.env.production; then
        if grep -q "VITE_FIREBASE_API_KEY=$" packages/frontend/.env.production; then
            echo -e "${YELLOW}⚠${NC} VITE_FIREBASE_API_KEY is empty (needs configuration)"
            ((WARNINGS++))
        else
            echo -e "${GREEN}✓${NC} Firebase API key is set"
        fi
    else
        echo -e "${RED}✗${NC} VITE_FIREBASE_API_KEY not found"
        ((ERRORS++))
    fi

    # Check if API URL is set
    if grep -q "VITE_API_URL=" packages/frontend/.env.production; then
        API_URL=$(grep "VITE_API_URL=" packages/frontend/.env.production | cut -d '=' -f2)
        if [ -z "$API_URL" ]; then
            echo -e "${YELLOW}⚠${NC} VITE_API_URL is empty (needs configuration)"
            ((WARNINGS++))
        else
            echo -e "${GREEN}✓${NC} API URL is set: $API_URL"
        fi
    else
        echo -e "${RED}✗${NC} VITE_API_URL not found"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} .env.production not found (recommended)"
    ((WARNINGS++))
fi

# Check .env.development
if [ -f "packages/frontend/.env.development" ]; then
    echo -e "${GREEN}✓${NC} .env.development exists"
else
    echo -e "${YELLOW}⚠${NC} .env.development not found (optional)"
    ((WARNINGS++))
fi

# Check .gitignore
if [ -f "packages/frontend/.gitignore" ]; then
    echo -e "${GREEN}✓${NC} .gitignore exists"

    # Check if .env is ignored
    if grep -q "^\.env$" packages/frontend/.gitignore; then
        echo -e "${GREEN}✓${NC} .env files are properly ignored"
    else
        echo -e "${YELLOW}⚠${NC} .env files may not be properly ignored"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} .gitignore not found"
    ((WARNINGS++))
fi

echo ""
echo "4. Checking Build Output..."
echo "---------------------------"

# Check if dist directory exists
if [ -d "packages/frontend/dist" ]; then
    echo -e "${GREEN}✓${NC} Build output directory exists"

    # Check if index.html exists
    if [ -f "packages/frontend/dist/index.html" ]; then
        echo -e "${GREEN}✓${NC} index.html found in dist"
    else
        echo -e "${YELLOW}⚠${NC} index.html not found (run 'npm run build')"
        ((WARNINGS++))
    fi

    # Check if assets directory exists
    if [ -d "packages/frontend/dist/assets" ]; then
        echo -e "${GREEN}✓${NC} Assets directory found"
    else
        echo -e "${YELLOW}⚠${NC} Assets directory not found (run 'npm run build')"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠${NC} Build output not found (run 'npm run build' first)"
    ((WARNINGS++))
fi

echo ""
echo "5. Checking Firebase CLI..."
echo "---------------------------"

# Check if Firebase CLI is installed
if command -v firebase &> /dev/null; then
    FIREBASE_VERSION=$(firebase --version)
    echo -e "${GREEN}✓${NC} Firebase CLI installed (version: $FIREBASE_VERSION)"
else
    echo -e "${RED}✗${NC} Firebase CLI not installed"
    echo "   Install with: npm install -g firebase-tools"
    ((ERRORS++))
fi

# Check if logged in to Firebase
if firebase projects:list &> /dev/null; then
    echo -e "${GREEN}✓${NC} Logged in to Firebase"
else
    echo -e "${YELLOW}⚠${NC} Not logged in to Firebase (run 'firebase login')"
    ((WARNINGS++))
fi

echo ""
echo "6. Checking Documentation..."
echo "----------------------------"

# Check README
if [ -f "packages/frontend/README.md" ]; then
    echo -e "${GREEN}✓${NC} README.md exists"
else
    echo -e "${YELLOW}⚠${NC} README.md not found (recommended)"
    ((WARNINGS++))
fi

# Check DEPLOYMENT.md
if [ -f "packages/frontend/DEPLOYMENT.md" ]; then
    echo -e "${GREEN}✓${NC} DEPLOYMENT.md exists"
else
    echo -e "${YELLOW}⚠${NC} DEPLOYMENT.md not found (recommended)"
    ((WARNINGS++))
fi

# Check HOSTING-QUICKSTART.md
if [ -f "packages/frontend/HOSTING-QUICKSTART.md" ]; then
    echo -e "${GREEN}✓${NC} HOSTING-QUICKSTART.md exists"
else
    echo -e "${YELLOW}⚠${NC} HOSTING-QUICKSTART.md not found (recommended)"
    ((WARNINGS++))
fi

echo ""
echo "=============================================="
echo "Verification Summary"
echo "=============================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "You're ready to deploy to Firebase Hosting:"
    echo "  firebase deploy --only hosting:production"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo ""
    echo "You can deploy, but consider addressing warnings:"
    echo "  firebase deploy --only hosting:production"
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    fi
    echo ""
    echo "Please fix the errors before deploying."
    exit 1
fi
