[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $WorldDirectory,

    [Parameter(Mandatory = $true)]
    [string] $SaveDirectory
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$worldItem = Get-Item -LiteralPath $WorldDirectory -ErrorAction Stop
if (-not $worldItem.PSIsContainer) {
    throw "World directory does not exist: $WorldDirectory"
}

$worldPath = $worldItem.FullName.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
$savePath = [IO.Path]::GetFullPath($SaveDirectory).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
$worldPrefix = $worldPath + [IO.Path]::DirectorySeparatorChar

if ($savePath.Equals($worldPath, [StringComparison]::OrdinalIgnoreCase) -or
    $savePath.StartsWith($worldPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Save directory must not be inside the world directory.'
}

if (-not (Get-Command tar.exe -ErrorAction SilentlyContinue)) {
    throw 'Required command is not installed: tar.exe'
}

New-Item -ItemType Directory -Path $savePath -Force | Out-Null

$worldName = $worldItem.Name
$safeWorldName = $worldName -replace '[^a-zA-Z0-9._-]', '_'
$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$archiveName = "${safeWorldName}_${timestamp}.tar.gz"
$archivePath = Join-Path $savePath $archiveName
$checksumPath = "$archivePath.sha256"
$temporaryArchive = Join-Path $savePath ".${safeWorldName}.$([guid]::NewGuid().ToString('N')).tmp"
$lockPath = Join-Path $savePath '.world-backup.lock'
$lockStream = $null

try {
    try {
        $lockStream = [IO.File]::Open($lockPath, [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
    }
    catch [IO.IOException] {
        throw "Another world backup is already running for: $savePath"
    }

    if ((Test-Path -LiteralPath $archivePath) -or (Test-Path -LiteralPath $checksumPath)) {
        throw "Refusing to replace an existing backup: $archivePath"
    }

    Write-Host "Backing up $worldPath to $archivePath"
    & tar.exe -czf $temporaryArchive -C $worldItem.Parent.FullName -- $worldName
    if ($LASTEXITCODE -ne 0) {
        throw "tar.exe failed with exit code $LASTEXITCODE"
    }

    Move-Item -LiteralPath $temporaryArchive -Destination $archivePath

    $hash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
    "$hash  $archiveName" | Set-Content -LiteralPath $checksumPath -Encoding Ascii

    Write-Host "Backup complete: $archivePath"
}
finally {
    if ($null -ne $lockStream) {
        $lockStream.Dispose()
    }

    if (Test-Path -LiteralPath $temporaryArchive) {
        Remove-Item -LiteralPath $temporaryArchive -Force
    }
}

