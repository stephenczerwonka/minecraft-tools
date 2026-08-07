[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [Alias('WorldDirectory')]
    [string] $WorldsDirectory,

    [Parameter(Mandatory = $true)]
    [string] $SaveDirectory,

    [string] $TaskName = 'Minecraft World Backup',

    [ValidateRange(1, 3650)]
    [int] $UpdatedWithinDays = 5
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$backupScript = Join-Path $PSScriptRoot 'backup-worlds.ps1'
$worldsPath = (Get-Item -LiteralPath $WorldsDirectory -ErrorAction Stop).FullName
$savePath = [IO.Path]::GetFullPath($SaveDirectory)

$arguments = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}" -WorldsDirectory "{1}" -SaveDirectory "{2}" -UpdatedWithinDays {3}' -f $backupScript, $worldsPath, $savePath, $UpdatedWithinDays
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
$trigger = New-ScheduledTaskTrigger -Daily -At '12:00 AM'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew

Register-ScheduledTask `
    -TaskName $TaskName `
    -Description "Back up Minecraft worlds updated within the last $UpdatedWithinDays days every night at midnight." `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Force | Out-Null

Write-Host "Scheduled task '$TaskName' will run every day at midnight."
