# PowerShell script to sync Supabase authentication fixes to server

$server = "saiworks@100.87.45.61"
$remotePath = "/home/saiworks/xagent"

Write-Host "Syncing Supabase authentication fixes..." -ForegroundColor Green

# Copy fixed service files
$files = @(
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
    "src/services/auth/AuthService.ts"
)

foreach ($file in $files) {
    Write-Host "Copying $file..." -ForegroundColor Yellow
    scp $file "$server`:$remotePath/$file"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $file copied successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to copy $file" -ForegroundColor Red
    }
}

Write-Host "`nAll files synced! Now rebuild on server:" -ForegroundColor Cyan
Write-Host "ssh $server" -ForegroundColor White
Write-Host "cd $remotePath" -ForegroundColor White
Write-Host "docker-compose -f docker-compose-with-ollama.yml build --no-cache app" -ForegroundColor White
Write-Host "docker-compose -f docker-compose-with-ollama.yml up -d app" -ForegroundColor White

