# Prepare Clean Deployment Package
# This script creates a clean package without node_modules and other unnecessary files

Write-Host "📦 Preparing Clean Deployment Package" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Create deployment directory
$deployDir = "xagent-clean-deployment"
if (Test-Path $deployDir) {
    Remove-Item $deployDir -Recurse -Force
}
New-Item -ItemType Directory -Name $deployDir | Out-Null

Write-Host "📁 Creating clean deployment package..." -ForegroundColor Yellow

# Copy essential directories
$directories = @("backend", "src", "public", "supabase", "neo4j", "ollama", "scripts", "data")
foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Copy-Item $dir "$deployDir\" -Recurse
        Write-Host "  ✅ Copied $dir" -ForegroundColor Green
    }
}

# Copy essential files
$files = @(
    "docker-compose.yml", "Dockerfile", "nginx.conf", "package.json", "package-lock.json",
    "vite.config.ts", "tailwind.config.js", "postcss.config.js", "eslint.config.js",
    "index.html", ".dockerignore", ".gitignore", "render.env.template", "render.yaml",
    "README.md", "DEPLOY.md", "manual-deploy.sh"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Copy-Item $file "$deployDir\"
        Write-Host "  ✅ Copied $file" -ForegroundColor Green
    }
}

# Copy TypeScript config files
Get-ChildItem "tsconfig*.json" | ForEach-Object { 
    Copy-Item $_.FullName "$deployDir\"
    Write-Host "  ✅ Copied $($_.Name)" -ForegroundColor Green
}

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    Copy-Item "render.env.template" ".env"
}
Copy-Item ".env" "$deployDir\"

# Create .dockerignore for the deployment
$dockerignoreContent = @"
node_modules
.git
dist
*.log
.env.local
.env.production
.DS_Store
Thumbs.db
*.tmp
.vscode
.idea
coverage
.nyc_output
*.tgz
*.tar.gz
"@

Set-Content "$deployDir\.dockerignore" $dockerignoreContent

# Create a .gitignore for the deployment
$gitignoreContent = @"
node_modules/
dist/
*.log
.env.local
.env.production
.DS_Store
Thumbs.db
*.tmp
.vscode/
.idea/
coverage/
.nyc_output/
*.tgz
*.tar.gz
"@

Set-Content "$deployDir\.gitignore" $gitignoreContent

# Show package size
$packageSize = (Get-ChildItem $deployDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host ""
Write-Host "✅ Clean deployment package created!" -ForegroundColor Green
Write-Host "📊 Package size: $([math]::Round($packageSize, 2)) MB" -ForegroundColor Cyan
Write-Host "📁 Location: $deployDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Yellow
Write-Host "1. Transfer the '$deployDir' folder to your Ubuntu server using WinSCP"
Write-Host "2. SSH to your server and run: cd xagent-clean-deployment && ./manual-deploy.sh"
Write-Host ""
Write-Host "📋 Excluded files:" -ForegroundColor Yellow
Write-Host "  - node_modules (will be installed during build)"
Write-Host "  - .git (version control history)"
Write-Host "  - dist (will be rebuilt)"
Write-Host "  - Various temporary and IDE files"
