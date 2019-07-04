function New-TableEntity {
    [CmdletBinding()]
    Param(
        [Parameter(Mandatory = $true)]
        [String]$Configuration,
        [Parameter(Mandatory = $true)]
        [String]$PartitionKey,
        [Parameter(Mandatory = $true)]
        [String]$RowKey
    )

    try {
        Trace-VstsEnteringInvocation $MyInvocation

        if ($Global:IsAz) {
            $Entity = [Microsoft.Azure.Cosmos.Table.DynamicTableEntity]::new($PartitionKey, $RowKey)
        }
        elseif ($Global:IsAzureRm) {
            $Entity = New-Object -TypeName Microsoft.WindowsAzure.Storage.Table.DynamicTableEntity -ArgumentList $PartitionKey, $RowKey
        }
        
        $Entity.Properties.Add("Data", $Configuration)
        if ($Global:IsAz) {
            $null = $StorageTable.CloudTable.Execute([Microsoft.Azure.Cosmos.Table.TableOperation]::Insert($Entity))
        }
        elseif ($Global:IsAzureRm) {
            $null = $StorageTable.CloudTable.Execute([Microsoft.WindowsAzure.Storage.Table.TableOperation]::Insert($Entity))
        }

    }
    catch {
        Write-Error -Message "$_" -ErrorAction Stop
    }
    finally {
        Trace-VstsLeavingInvocation $MyInvocation
    }
}
