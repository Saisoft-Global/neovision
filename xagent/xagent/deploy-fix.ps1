# Quick deployment script for Supabase authentication fixes

$server = "saiworks@100.87.45.61"
$remotePath = "/home/saiworks/xagent"

Write-Host "`n=== Deploying Supabase Authentication Fixes ===" -ForegroundColor Cyan
Write-Host "This will fix the 'TypeError: o is not a function' errors`n" -ForegroundColor Yellow

# Create temporary directory for batch copy
$tempDir = "deploy-temp"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# Copy all files to temp directory maintaining structure
Write-Host "Preparing files..." -ForegroundColor Green

$files = @(
    "src/config/supabase/index.ts",
    "src/services/agent/AgentFactory.ts",
    "src/services/email/EmailService.ts",
    "src/services/context/SharedContext.ts",
    "src/services/knowledge/versioning/KnowledgeVersionManager.ts",
    "src/services/workflow/template/WorkflowTemplateManager.ts",
    "src/services/workflow/version/WorkflowVersionManager.ts",
    "src/services/meeting/MeetingService.ts",
    "src/services/metrics/CollaborationMetrics.ts",
    "src/services/feedback/FeedbackCollector.ts",
    "src/services/training/DatasetManager.ts",
    "src/services/training/ModelVersionManager.ts",
    "src/services/integration/webhook/WebhookManager.ts",
    "src/services/integration/datasource/DataSourceManager.ts",
    "src/services/agent/templates/TemplateManager.ts",
    "src/services/embeddings/EmbeddingRefresher.ts",
    "src/services/auth/SessionManager.ts",
    "src/services/auth/AuthService.ts",
    "src/components/test/SupabaseConnectionTest.tsx",
    "src/routes/index.tsx"
)

foreach ($file in $files) {
    $destDir = Split-Path -Parent "$tempDir\$file"
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    Copy-Item $file "$tempDir\$file" -Force
    Write-Host "  ✓ $file" -ForegroundColor Gray
}

Write-Host "`nUploading to server..." -ForegroundColor Green
scp -r "$tempDir\src" "$server`:$remotePath/"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Files uploaded successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Upload failed!" -ForegroundColor Red
    Remove-Item -Recurse -Force $tempDir
    exit 1
}

# Cleanup
Remove-Item -Recurse -Force $tempDir

Write-Host "`n=== Next Steps ===" -ForegroundColor Cyan
Write-Host "Run these commands to rebuild:" -ForegroundColor Yellow
Write-Host ""
Write-Host "ssh $server" -ForegroundColor White
Write-Host "cd $remotePath" -ForegroundColor White
Write-Host "docker-compose -f docker-compose-with-ollama.yml build --no-cache app" -ForegroundColor White
Write-Host "docker-compose -f docker-compose-with-ollama.yml up -d app" -ForegroundColor White
Write-Host ""
Write-Host "Or run this one-liner:" -ForegroundColor Yellow
Write-Host "ssh $server 'cd $remotePath && docker-compose -f docker-compose-with-ollama.yml build --no-cache app && docker-compose -f docker-compose-with-ollama.yml up -d app'" -ForegroundColor White
Write-Host ""

