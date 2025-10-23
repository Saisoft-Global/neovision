# Create Clean Deployment Package
Write-Host "Creating clean deployment package..." -ForegroundColor Green

# Create deployment directory
$deployDir = "xagent-clean"
if (Test-Path $deployDir) {
    Remove-Item $deployDir -Recurse -Force
}
New-Item -ItemType Directory -Name $deployDir | Out-Null

# Copy essential directories (excluding node_modules)
$directories = @("backend", "src", "public", "supabase", "neo4j", "ollama", "scripts")
foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Copy-Item $dir "$deployDir\" -Recurse
        Write-Host "Copied $dir" -ForegroundColor Green
    }
}

# Copy essential files
$files = @("docker-compose.yml", "Dockerfile", "nginx.conf", "package.json", "package-lock.json", "vite.config.ts", "tailwind.config.js", "postcss.config.js", "eslint.config.js", "index.html", ".dockerignore", ".gitignore", "render.env.template", "render.yaml", "README.md", "DEPLOY.md", "manual-deploy.sh")

foreach ($file in $files) {
    if (Test-Path $file) {
        Copy-Item $file "$deployDir\"
        Write-Host "Copied $file" -ForegroundColor Green
    }
}

# Copy TypeScript config files
Get-ChildItem "tsconfig*.json" | ForEach-Object { Copy-Item $_.FullName "$deployDir\" }

# Create .env file
if (-not (Test-Path ".env")) {
    Copy-Item "render.env.template" ".env"
}
Copy-Item ".env" "$deployDir\"

# Show package info
$packageSize = (Get-ChildItem $deployDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host ""
Write-Host "Clean deployment package created!" -ForegroundColor Green
Write-Host "Package size: $([math]::Round($packageSize, 2)) MB" -ForegroundColor Cyan
Write-Host "Location: $deployDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Transfer the '$deployDir' folder to your Ubuntu server using WinSCP"
Write-Host "2. SSH to your server and run: cd xagent-clean && ./manual-deploy.sh"
