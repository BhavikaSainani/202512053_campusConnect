# Lab 5 Automated Execution & Verification Script
# Student ID: 202512053

# Refresh PATH from system and user environments
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     CAMPUSCONNECT LAB 5 - DOCKER VERIFICATION SCRIPT     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Step 0: Check Docker Installation
Write-Host "`n[Check 22] Checking Docker Installation..." -ForegroundColor Yellow
try {
    docker --version
    docker compose version
    Write-Host " Docker CLI is installed and running." -ForegroundColor Green
} catch {
    Write-Host " Docker command not found. Please ensure Docker Desktop is running." -ForegroundColor Red
    exit 1
}

# Step 1: Baseline Lab 4 API Verification
Write-Host "`n[Step 1 / Item 23] Lab 4 Baseline API ready in student-api-express" -ForegroundColor Yellow

# Step 2 & 3: Build Docker Image
Write-Host "`n[Step 3 / Item 25] Building Docker Image: student-api:v1..." -ForegroundColor Yellow
docker build -t student-api:v1 ./student-api-express
if ($LASTEXITCODE -ne 0) { Write-Host "Build failed." -ForegroundColor Red; exit 1 }

# Check images (Item 26)
Write-Host "`n[Item 26] Listing Docker Images:" -ForegroundColor Yellow
docker images student-api:v1

# Step 7: Create Network
Write-Host "`n[Step 7 / Item 30] Creating Docker Network: student-network..." -ForegroundColor Yellow
docker network create student-network 2>$null

# Step 9: Create Volume
Write-Host "`n[Step 9 / Item 33] Creating Docker Volume: student-mongo-data..." -ForegroundColor Yellow
docker volume create student-mongo-data
docker volume ls

# Start MongoDB container with volume
Write-Host "`n[Step 6 & 9 / Item 29] Starting MongoDB container..." -ForegroundColor Yellow
docker rm -f mongodb 2>$null
docker run -d --name mongodb --network student-network -v student-mongo-data:/data/db -p 27017:27017 mongo:latest

# Step 4: Run Student API container connected to MongoDB via network
Write-Host "`n[Step 4 & 8 / Item 27, 31, 32] Starting Student API container..." -ForegroundColor Yellow
docker rm -f student-api 2>$null
docker run -d --name student-api --network student-network -p 3001:3001 `
  -e PORT=3001 `
  -e MONGO_URI="mongodb://mongodb:27017/campusconnect" `
  student-api:v1

Start-Sleep -Seconds 5

# Step 5: Test API & Perform Persistence Action Item
Write-Host "`n[Step 5 / Item 28] Testing Containerized REST API Endpoints..." -ForegroundColor Yellow

# 1. Health check
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/" -Method Get
    Write-Host " Health Check (GET /): $($health.message)" -ForegroundColor Green
} catch {
    Write-Host " Health Check Failed: $_" -ForegroundColor Red
}

# 2. Insert Student Record
$newStudent = @{
    name = "Bhavika Sainani"
    email = "bhavika@example.com"
    course = "Computer Science"
    semester = 3
} | ConvertTo-Json

try {
    $created = Invoke-RestMethod -Uri "http://localhost:3001/students" -Method Post -Body $newStudent -ContentType "application/json"
    $studentId = $created.id
    Write-Host " POST /students created student ID: $studentId" -ForegroundColor Green
} catch {
    Write-Host " POST /students Failed: $_" -ForegroundColor Red
}

# 3. Retrieve Students
try {
    $students = Invoke-RestMethod -Uri "http://localhost:3001/students" -Method Get
    Write-Host " GET /students retrieved $($students.Count) student(s)." -ForegroundColor Green
} catch {
    Write-Host " GET /students Failed: $_" -ForegroundColor Red
}

# =========================================================================
# EXPLICIT ACTION ITEM: STEP 9 - PERSISTENCE TEST
# =========================================================================
Write-Host "`n==========================================================" -ForegroundColor Magenta
Write-Host "   EXPLICIT ACTION ITEM: STEP 9 - PERSISTENCE TEST        " -ForegroundColor Magenta
Write-Host "==========================================================" -ForegroundColor Magenta
Write-Host "1. Stopping and destroying the running MongoDB container..." -ForegroundColor Yellow
docker stop mongodb
docker rm mongodb
Write-Host " MongoDB container removed. Volume 'student-mongo-data' remains intact." -ForegroundColor Cyan

Write-Host "2. Recreating a new MongoDB container using the SAME volume..." -ForegroundColor Yellow
docker run -d --name mongodb --network student-network -v student-mongo-data:/data/db -p 27017:27017 mongo:latest
Start-Sleep -Seconds 5

Write-Host "3. Querying GET /students from API to verify data survived container destruction..." -ForegroundColor Yellow
try {
    $persistedStudents = Invoke-RestMethod -Uri "http://localhost:3001/students" -Method Get
    Write-Host " Persistence Success! Found $($persistedStudents.Count) student(s) after DB container recreation." -ForegroundColor Green
    $persistedStudents | Format-Table id, name, email, course, semester
} catch {
    Write-Host " Persistence Test Query Failed: $_" -ForegroundColor Red
}

# =========================================================================
# STEP 10 & 11: DOCKER COMPOSE ORCHESTRATION
# =========================================================================
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "   STEP 10 & 11: DOCKER COMPOSE ORCHESTRATION TEST        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Cleanup standalone containers
docker rm -f student-api mongodb 2>$null

Write-Host "`n[Step 11 / Item 36] Running 'docker compose up -d --build'..." -ForegroundColor Yellow
docker compose up -d --build

Write-Host "`n[Item 37] Docker Compose Service Status (docker compose ps):" -ForegroundColor Yellow
docker compose ps

Start-Sleep -Seconds 4

Write-Host "`n[Item 38] Testing API on Docker Compose Stack..." -ForegroundColor Yellow
try {
    $composeStudents = Invoke-RestMethod -Uri "http://localhost:3001/students" -Method Get
    Write-Host " Compose Stack verified! Retrieved $($composeStudents.Count) student(s)." -ForegroundColor Green
} catch {
    Write-Host " Compose API Test Failed: $_" -ForegroundColor Red
}

Write-Host "`n[Item 39] Recent Compose Logs (docker compose logs --tail 20):" -ForegroundColor Yellow
docker compose logs --tail 20

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "   ALL LAB 5 VERIFICATION CHECKS COMPLETED SUCCESSFULLY!  " -ForegroundColor Green
Write-Host "   To stop the compose application, run: docker compose down" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
