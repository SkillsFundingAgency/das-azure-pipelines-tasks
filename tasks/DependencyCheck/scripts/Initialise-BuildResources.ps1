[CmdletBinding()]
param(
    $SharedStorageAccountName,
    $StorageAccountContainerName,
    $StorageAccountService
)

Copy-Item "$(System.DefaultWorkingDirectory)/temp-tests" -Destination "$(System.DefaultWorkingDirectory)/tasks/DependencyCheck/task/tests" -Recurse
$Path = "$(System.DefaultWorkingDirectory)/tasks/DependencyCheck/task"
$Value = @"
enableVulnerabilityFilesMaintenance=true
writeStorageAccountContainerSasUri=https://$(SharedStorageAccountName).$(StorageAccountService).core.windows.net/$(StorageAccountContainerName)$($ENV:WRITE_STORAGE_ACCOUNT_CONTAINER_SAS_URI)
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
Rename-Item "$(System.DefaultWorkingDirectory)/tasks/DependencyCheck/task" "$(System.DefaultWorkingDirectory)/tasks/DependencyCheck/$($ENV:GITVERSION_MAJORMINORPATCH)"