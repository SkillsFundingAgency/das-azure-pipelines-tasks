[CmdletBinding()]
param(
    $RootDirectory,
    $SharedStorageAccountName,
    $StorageAccountContainerName,
    $StorageAccountService
)

Copy-Item "$RootDirectory/temp-tests" -Destination "$RootDirectory/tasks/DependencyCheck/task/tests" -Recurse
$Path = "$RootDirectory/tasks/DependencyCheck/task"
$Value = @"
enableVulnerabilityFilesMaintenance=true
writeStorageAccountContainerSasUri=https://$SharedStorageAccountName.$StorageAccountService.core.windows.net/$StorageAccountContainerName$ENV:WRITE_STORAGE_ACCOUNT_CONTAINER_SAS_URI
logAnalyticsWorkspaceId=placeholder
logAnalyticsWorkspaceKey=placeholder
enableSelfHostedVulnerabilityFiles=placeholder
readStorageAccountContainerSasUri=placeholder
scanPath=placeholder
excludedScanPathPatterns=placeholder
severityThreshold=placeholder
dependencyCheckDashboardUrl=placeholder
"@
New-Item -Path $Path -Name ".env" -Value $Value
Get-Content -Path "$($Path)/.env"
Rename-Item "$RootDirectory/tasks/DependencyCheck/task" "$RootDirectory/tasks/DependencyCheck/$ENV:GITVERSION_MAJORMINORPATCH"