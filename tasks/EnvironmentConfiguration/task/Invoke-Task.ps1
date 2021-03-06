<#
#>
try {
    Trace-VstsEnteringInvocation $MyInvocation

    Import-Module -Name $PSScriptRoot/InitializationHelpers.psm1 -Force
    Initialize-TaskDependencies

    $AzAccountsModule = @(Get-Module Az.Accounts -ListAvailable)[0]
    $AzureRmProfileModule = @(Get-Module AzureRm.Profile -ListAvailable)[0]
    if ($AzAccountsModule) {
        Enable-AzureRmAlias -Scope Process
        $Global:IsAz = $true
        Write-Host "Using Az Module"
    }
    elseif ($AzureRmProfileModule) {
        $Global:IsAzureRm = $true
        Write-Host "Using AzureRm Module"
    }
    else {
        throw "No Azure powershell module found"
    }

    if ($ENV:TF_BUILD) {

        # --- Inputs
        $SourcePath = Get-VstsInput -Name SourcePath -Require
        $TargetFilename = Get-VstsInput -Name TargetFilename -Require
        $TableName = Get-VstsInput -Name TableName -Require

        $StorageAccount = Get-VstsInput -Name StorageAccountName -Require
        $ServiceEndpointName = Get-VstsInput -Name ServiceConnectionName -require

        # --- Variables
        $EnvironmentName = (Get-VstsTaskVariable -Name EnvironmentName).ToUpper()
        if (!$EnvironmentName) {
            $EnvironmentName = (Get-VstsTaskVariable -Name RELEASE_ENVIRONMENTNAME).ToUpper()
        }

        # --- Init
        $Endpoint = Get-VstsEndpoint -Name $ServiceEndpointName -Require

        if ($Global:IsAz) {
            Initialize-AzModule -Endpoint $Endpoint
        }
        elseif ($Global:IsAzureRm) {
            Initialize-AzureRMModule -Endpoint $Endpoint
        }
        else {
            throw "Couldn't find Global Azure module setting $($MyInvocation.ScriptLineNumber) $($MyInvocation.ScriptName)"
        }
    }

    $NewEnvironmentConfigurationTableEntryParameters = @{
        SourcePath      = $SourcePath
        TargetFilename  = $TargetFilename
        StorageAccount  = $StorageAccount
        TableName       = $TableName
        EnvironmentName = $EnvironmentName
    }

    New-ConfigurationTableEntry @NewEnvironmentConfigurationTableEntryParameters
}
catch {
    Write-Error -Message "$_" -ErrorAction Stop
}
finally {
    Trace-VstsLeavingInvocation $MyInvocation
}
