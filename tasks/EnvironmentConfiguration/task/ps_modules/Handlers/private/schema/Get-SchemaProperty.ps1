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

    function Set-PropertyType {
        param(
            [string]$Value,
            [string]$Type
        )
        switch ($Type) {
            'Standard' {
                Write-Verbose "Leaving as a string"
                return "$Value"
            }

            'AsInt' {
                Write-Verbose "Casting to an int"
                return [int]$Value
            }

            'AsNumber' {
                Write-Verbose "Casting to a decimal"
                return [Decimal]::Parse($Value)
            }

            'AsArray' {
                Write-Verbose "Casting to an array"
                return @($Value | ConvertFrom-Json)
            }

            'AsBool' {
                Write-Verbose "Casting to a boolean"
                return "$Value".ToLower() -in '1', 'true'
            }
        }
    }

    try {
        Trace-VstsEnteringInvocation $MyInvocation

        if ($PropertyObject.ExtensionData.ContainsKey("environmentVariable")) {
            $VariableName = $PropertyObject.ExtensionData.Item("environmentVariable").Value
            $TaskVariable = Get-VstsTaskVariable -Name $VariableName

            if (![string]::IsNullOrEmpty($TaskVariable)) {
                Write-Verbose "$VariableName found"
                $TaskVariable = Set-PropertyType -Value $TaskVariable -Type $PSCmdlet.ParameterSetName
                Write-Output $TaskVariable
                return
            }
        }

        if ([string]::IsNullOrEmpty($TaskVariable) -and $null -ne $PropertyObject.Default) {
            Write-Verbose -Message "No environment variable found but a default value is present in the schema"
            $TaskVariable = Set-PropertyType -Value $PropertyObject.Default.Value -Type $PSCmdlet.ParameterSetName
            Write-Verbose -Message "Set default value '$TaskVariable'"
        }
        else {
            throw "No environment variable found and no default value set in schema"
        }

        Write-Output $TaskVariable
        return
    }
    catch {
        Write-Error -Message "Could not get property from object [ $VariableName ] : $_" -ErrorAction Stop
    }
    finally {
        Trace-VstsLeavingInvocation $MyInvocation
    }
}
