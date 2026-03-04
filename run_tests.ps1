# Powershell script to run OST functional tests

Write-Host "Setting up test dependencies..."

# Activate virtual environment if running from root
if (Test-Path "venv\Scripts\Activate.ps1" -PathType Leaf) {
    . "venv\Scripts\Activate.ps1"
}

# Ensure playwright is installed
pip install pytest pytest-playwright
playwright install chromium

Write-Host "`nStarting Application Server... (Make sure the port is free)"
# Run the flask app in the background
$appProcess = Start-Process python -ArgumentList "app.py" -PassThru -NoNewWindow

# Wait for server to start
Start-Sleep -Seconds 3

Write-Host "`nRunning Test Suite..."
# Run pytest on the functional tests directory
pytest tests\test_functional.py -v

# Cleanup
Write-Host "`nTesting complete. Stopping the test server..."
Stop-Process -Id $appProcess.Id -Force
Write-Host "Done!"
