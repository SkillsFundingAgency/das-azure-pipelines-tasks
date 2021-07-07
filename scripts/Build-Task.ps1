<#
    .SYNOPSIS
    Install common task modules at build time

    .DESCRIPTION
    Install common task modules at build time

    .PARAMETER TaskRoot
    The root of the task to be built

    .PARAMETER Clean
    Clean package directories before building

    .PARAMETER Build
    Package an extension package

    .PARAMETER Publish
    Packge and publish an extension package to the marketplace

    .PARAMETER AccessToken
    A personal access token with enough privileges to publish the package

    .PARAMETER SkipRestore
    Don't restore dependencies listed in dependency.json

    .EXAMPLE
    ./Build-Task.ps1 -TaskRoot ./MyTask

    .EXAMPLE
    ./Build-Task.ps1 -TaskRoot ./MyTask -Clean

    .EXAMPLE
    ./Build-Task.ps1 -TaskRoot ./MyTask -Clean -Build

    .EXAMPLE
    ./Build-Task.ps1 -TaskRoot ./MyTask -Clean -Publish

    .EXAMPLE
    ./Build-Task.ps1 -TaskRoot ./MyTask -Publish -SkipRestore

    .NOTES
    Requirements:
    The following applications must be installed and available in your PATH
    - git
    - tfx-cli
#>
[CmdletBinding(DefaultParameterSetName = "Build")]
Param(
    [Parameter(Mandatory = $true)]
    [System.Io.FileInfo]$TaskRoot,
    [Parameter(Mandatory = $true)]
    [System.Io.FileInfo]$ReleaseOutputDirectory,
    [Parameter(Mandatory = $false)]
    [switch]$Clean,
    [Parameter(Mandatory = $false)]
    [Parameter(Mandatory = $true, ParameterSetName = "Build")]
    [switch]$Build,
    [Parameter(Mandatory = $false, ParameterSetName = "Publish")]
    [switch]$Publish,
    [Parameter(Mandatory = $true, ParameterSetName = "Publish")]
    [string]$AccessToken,
    [Parameter(Mandatory = $false)]
    [switch]$SkipRestore
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

        $NewVersion = $ENV:BUILD_BUILDNUMBER
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

# --- Ensure that nuget is available
$null = Register-PackageSource -ProviderName Nuget -Name nuget.org -Location https://www.nuget.org/api/v2 -Trusted:$true -Force

Write-Verbose -Message "Resolving common paths.."
$ResolvedTaskRoot = (Resolve-Path -Path "$TaskRoot").Path
$ConfigPath = "$($ResolvedTaskRoot)/dependency.json"
$PackageTemp = "$($ENV:Temp)/$((New-Guid).ToString())"

$null = New-Item -Path $PackageTemp -ItemType Directory -Force
Write-Verbose -Message "ResolvedTaskRoot: $ResolvedTaskRoot"
Write-Verbose -Message "ConfigPath: $ConfigPath"

if (!$ConfigPath) {
    throw "Could not find dependency.json at $ConfigPath"
}

Write-Verbose -Message "Retrieving config definition from $ConfigPath"
$Config = (Get-Content -Path $ConfigPath -Raw) | ConvertFrom-Json

if ($Clean.IsPresent -and $SkipRestore.IsPresent) {
    Write-Warning -Message "Don't use Clean and SkipRestore together. Clean task will now be skipped!"
}

if ($Clean.IsPresent -and !$SkipRestore.IsPresent) {
    Write-Host "Cleaning package directories:"
    $Config.Include | Select-Object -Property Path -Unique | ForEach-Object {
        if ($_.Path) {
            Write-Host " - $($_.Path)"
            Get-ChildItem -Path "$($ReleaseOutputDirectory)/$($_.Path)" -Recurse | Remove-Item -Recurse -Force
        }
    }

    Remove-Item -Path $ReleaseOutputDirectory -Force -Recurse -ErrorAction SilentlyContinue
}

if ($Build.IsPresent -and $ENV:BUILD_BUILDNUMBER) {
    Set-Version -TaskRoot $ResolvedTaskRoot
}

$null = New-Item -Path $ReleaseOutputDirectory -ItemType Directory -Force -ErrorAction SilentlyContinue
Copy-Item -Path $ResolvedTaskRoot\* -Destination $ReleaseOutputDirectory -Recurse -Force -Verbose

if (!$SkipRestore.IsPresent) {

    foreach ($Package in $Config.Include | Sort-Object -Property Type) {
        Write-Verbose -Message "Processing package dependency $($Package.Name)"
        Write-Verbose -Message "Clean package directories: $($Clean.IsPresent)"

        Write-Verbose -Message "Resolving package path"
        [System.IO.FileInfo]$ResolvedPackagePath = "$($ReleaseOutputDirectory)/$($Package.Path)"
        Write-Verbose -Message "ResolvedPackagePath: $ReleaseOutputDirectory"

        switch ($Package.Type) {
            'PSGallery' {
                $PackageInstallDirectory = "$PackageTemp/$($Package.Name)"

                $SaveModuleParameters = @{
                    Name            = $Package.Name
                    Path            = $PackageTemp
                    RequiredVersion = $Package.Version
                    Force           = $true
                }

                Write-Host "[PSGallery] Saving module $($Package.Name) to $PackageTemp "
                Save-Module @SaveModuleParameters

                if ($Package.Copy) {
                    $Package.Copy | ForEach-Object {
                        Write-Host "[PSGallery] Copying module $($Package.Name) to $($Package.Path)"
                        Copy-Item -Path $PackageInstallDirectory/$_ -Destination "$ResolvedPackagePath/$($Package.Name)" -Recurse -Force
                    }
                }

                break
            }
            'Nuget' {
                $PackageSources = @(Get-PackageSource | Where-Object { $_.Name -like "*nuget*" })
                $PackageDestination = "$PackageTemp/$($Package.Name).$($Package.Version)"

                $InstallPackageParameters = @{
                    Name             = $Package.Name
                    Destination      = $PackageTemp
                    SkipDependencies = $true
                    ForceBootstrap   = $true
                    RequiredVersion  = $Package.Version
                    Force            = $true
                    Source           = $PackageSources[0].Name
                }

                Write-Host "[NuGet] Installing package $($Package.Name) to $($PackageTemp)"
                $null = Install-Package @InstallPackageParameters

                if ($Package.Copy) {
                    $null = New-Item -Path $ResolvedPackagePath -ItemType Directory -ErrorAction SilentlyContinue
                    $Package.Copy | ForEach-Object {
                        Write-Host "[NuGet] Copying dependency $_ to $ResolvedPackagePath"
                        Copy-Item -Path $PackageDestination/$_ -Destination $ResolvedPackagePath -Recurse -Force
                    }
                }

                break
            }
            'GitHub' {
                $RepositoryUrl = "https://github.com/$($Package.Name).git"
                $RepositoryDestination = "$PackageTemp/$($Package.Name.Split("/")[1])"
                Write-Host "[GitHub] Processing $($RepositoryUrl)"
                & git.exe clone `
                    --depth 1 `
                    --no-checkout `
                    $RepositoryUrl `
                    $RepositoryDestination

                if ($Package.Copy) {
                    $Package.Copy | ForEach-Object {
                        & git.exe -C $RepositoryDestination checkout HEAD "$_/*"
                        Write-Host "[GitHub] Copying dependency $_ to $($Package.Path)"
                        Copy-Item -Path $RepositoryDestination/$_ -Destination $ResolvedPackagePath -Recurse -Force
                    }
                }
                break
            }
            'Local' {
                if ($Package.Copy) {
                    $Package.Copy | ForEach-Object {
                        Write-Host "[Local] Copying dependency $_ to $($Package.Path)"
                        Copy-Item -Path $ResolvedTaskRoot/$_ -Destination $ResolvedPackagePath -Recurse -Force
                    }
                }
            }
            'Default' {
                throw "Unknown package type: $($Package.Type). Supported package types are [GitHub, NuGet, PowerShellGallery]"
            }
        }
    }
}

