<#
    .SYNOPSIS
    Set task version at build time

    .DESCRIPTION
    Set task version at build time

    .PARAMETER TaskRoot
    The root of the task to be built

    .EXAMPLE
    ./Set-Version.ps1 -TaskRoot ./MyTask
#>
[CmdletBinding()]
Param(
    [Parameter(Mandatory = $true)]
    [System.Io.FileInfo]$TaskRoot
)

# Default error action to stop
$ErrorActionPreference = "Stop"

function Set-Version {
    Param (
        [Parameter(Mandatory = $true)]
        [String]$TaskRoot
    )
    try {
        $Manifest = "$TaskRoot/vss-extension.json"
        $Task = "$TaskRoot/task/task.json"

        $NewVersion = $ENV:GITVERSION_MAJORMINORPATCH
        [Version]$Version = $NewVersion

        $ManifestObject = Get-Content -Path $Manifest -Raw | ConvertFrom-Json
        $TaskObject = Get-Content -Path $Task -Raw | ConvertFrom-Json

        $ManifestObject.Version = $Version.ToString()

        $TaskObject.Version.Major = $Version.Major
        $TaskObject.Version.Minor = $Version.Minor
        $TaskObject.Version.Patch = $Version.Build
        Write-Verbose -Message "Version set to $NewVersion"

        $ManifestObject | ConvertTo-Json -Depth 10 | Set-Content -Path $Manifest
        $TaskObject | ConvertTo-Json -Depth 10 | Set-Content -Path $Task
    }
    catch {
        Write-Error -Message "Failed to update task version number: $_" -ErrorAction Stop
    }
}

try {
    if ($ENV:GITVERSION_MAJORMINORPATCH) {
        $ResolvedTaskRoot = (Resolve-Path -Path "$TaskRoot").Path
        Set-Version -TaskRoot $ResolvedTaskRoot
    }
}
catch {
    $PSCmdlet.ThrowTerminatingError($_)
}
