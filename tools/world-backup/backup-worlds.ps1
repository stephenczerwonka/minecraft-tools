[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [Alias('WorldDirectory')]
    [string] $WorldsDirectory,

    [Parameter(Mandatory = $true)]
    [string] $SaveDirectory,

    [ValidateRange(1, 3650)]
    [int] $UpdatedWithinDays = 5
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$worldsRoot = Get-Item -LiteralPath $WorldsDirectory -ErrorAction Stop
if (-not $worldsRoot.PSIsContainer) {
    throw "Worlds directory does not exist: $WorldsDirectory"
}

$worldsRootPath = $worldsRoot.FullName.TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
$savePath = [IO.Path]::GetFullPath($SaveDirectory).TrimEnd([IO.Path]::DirectorySeparatorChar, [IO.Path]::AltDirectorySeparatorChar)
$worldsRootPrefix = $worldsRootPath + [IO.Path]::DirectorySeparatorChar

if ($savePath.Equals($worldsRootPath, [StringComparison]::OrdinalIgnoreCase) -or
    $savePath.StartsWith($worldsRootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Save directory must not be inside the worlds directory.'
}

$cutoff = [DateTime]::UtcNow.AddDays(-$UpdatedWithinDays)
$backupScript = Join-Path $PSScriptRoot 'backup-world.ps1'
$worlds = Get-ChildItem -LiteralPath $worldsRootPath -Directory |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'level.dat') }

$eligibleCount = 0
$backupCount = 0
$failures = [Collections.Generic.List[string]]::new()

foreach ($world in $worlds) {
    $recentFile = Get-ChildItem -LiteralPath $world.FullName -File -Recurse -Force -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTimeUtc -ge $cutoff } |
        Select-Object -First 1

    if ($null -eq $recentFile) {
        Write-Host "Skipping unchanged world: $($world.Name)"
        continue
    }

    $eligibleCount++
    try {
        & $backupScript -WorldDirectory $world.FullName -SaveDirectory $savePath
        $backupCount++
    }
    catch {
        $failures.Add("$($world.Name): $($_.Exception.Message)")
        Write-Error "Failed to back up '$($world.Name)': $($_.Exception.Message)" -ErrorAction Continue
    }
}

if ($worlds.Count -eq 0) {
    Write-Host "No Minecraft worlds (folders containing level.dat) found in: $worldsRootPath"
}
elseif ($eligibleCount -eq 0) {
    Write-Host "No worlds were updated in the last $UpdatedWithinDays days."
}
else {
    Write-Host "Backed up $backupCount of $eligibleCount recently updated worlds."
}

if ($failures.Count -gt 0) {
    throw "$($failures.Count) world backup(s) failed: $($failures -join '; ')"
}

