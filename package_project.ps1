# Package OST Project for Portability
# Run this script to create a ZIP file (OST_Transfer.zip) with everything you need 
# to run the project on another machine.

$ProjectName = "OST_Transfer"
$ZipName = "$ProjectName.zip"
$ExcludeList = @("venv", ".git", ".pytest_cache", "__pycache__", ".agent", ".playwright-mcp", "*.log", "$ZipName")

Write-Host "--- packaging OST Project ---" -ForegroundColor Cyan

# Create a list of files to include
$FilesToInclude = Get-ChildItem -Path . -Exclude $ExcludeList

if (Test-Path $ZipName) {
    Remove-Item $ZipName
}

Write-Host "Creating $ZipName..." -ForegroundColor Yellow
Compress-Archive -Path $FilesToInclude -DestinationPath $ZipName -Force

Write-Host "✅ Success! Transfer '$ZipName' to your new computer." -ForegroundColor Green
Write-Host "On your new computer:" -ForegroundColor White
Write-Host "1. Extract the ZIP." -ForegroundColor White
Write-Host "2. Create a fresh virtual environment: python -m venv venv" -ForegroundColor White
Write-Host "3. Activate it: .\venv\Scripts\activate" -ForegroundColor White
Write-Host "4. Install dependencies: pip install -r requirements.txt" -ForegroundColor White
Write-Host "5. Run the app: python app.py" -ForegroundColor White
