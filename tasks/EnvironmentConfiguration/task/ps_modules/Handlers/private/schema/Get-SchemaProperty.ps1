function Get-SchemaProperty {
    [CmdletBinding(DefaultParameterSetName = "Standard")]
    Param(
        [Parameter(Mandatory = $true, ParameterSetName = "Standard")]
        [Parameter(Mandatory = $true, ParameterSetName = "AsInt")]
        [Parameter(Mandatory = $true, ParameterSetName = "AsNumber")]
        [Parameter(Mandatory = $true, ParameterSetName = "AsArray")]
        [Parameter(Mandatory = $true, ParameterSetName = "AsBool")]
        $PropertyObject,
        [Parameter(Mandatory = $false, ParameterSetName = "AsInt")]
        [Switch]$AsInt,
        [Parameter(Mandatory = $false, ParameterSetName = "AsNumber")]
        [Switch]$AsNumber,
        [Parameter(Mandatory = $false, ParameterSetName = "AsArray")]
        [Switch]$AsArray,
        [Parameter(Mandatory = $false, ParameterSetName = "AsBool")]
        [Switch]$AsBool
    )

    try {

        Trace-VstsEnteringInvocation $MyInvocation

        if ($PropertyObject.ExtensionData.ContainsKey("environmentVariable")) {

            $VariableName = $PropertyObject.ExtensionData.Item("environmentVariable").Value

            switch ($PSCmdlet.ParameterSetName) {

                'Standard' {
                    $TaskVariable = Get-VstsTaskVariable -Name $VariableName
                    break
                }

                'AsInt' {
                    $TaskVariable = Get-VstsTaskVariable -Name $VariableName -AsInt
                    break
                }

                'AsNumber' {
                    $TaskVariable = [Decimal]::Parse((Get-VstsTaskVariable -Name $VariableName))
                    break
                }

                'AsArray' {
                    $ArrayString = Get-VstsTaskVariable -Name $VariableName
                    $TaskVariable = $ArrayString  | ConvertFrom-Json
                    break
                }

                'AsBool' {
                    $TaskVariable = Get-VstsTaskVariable -Name $VariableName -AsBool
                    break
                }

            }
        }

        if (!$TaskVariable -and	$null -ne $PropertyObject.Default) {
            Write-Verbose -Message "No environment variable found for [ $VariableName ] and a default value is present in the schema"
            $TaskVariable = $PropertyObject.Default.Value
            Write-Verbose -Message "$($VariableName.ToUpper()): $TaskVariable "
        }

        if (!$TaskVariable) {
            throw "No environment variable found and no default value set in schema"
        }

        Write-Output $TaskVariable
    }
    catch {
        Write-Error -Message "Could not get property from object [ $VariableName ] : $_" -ErrorAction Stop
    }
    finally {
        Trace-VstsLeavingInvocation $MyInvocation
    }
}