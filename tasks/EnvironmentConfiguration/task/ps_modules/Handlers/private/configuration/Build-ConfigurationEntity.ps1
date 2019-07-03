function Build-ConfigurationEntity {
    <#
#>
    [CmdletBinding()]
    Param(
        [Parameter(Mandatory = $true)]
        [ValidateNotNullOrEmpty()]
        [String]$SchemaDefinitionPath
    )

    try {
            Trace-VstsEnteringInvocation $MyInvocation

            Write-Host "Parsing schema: $(([System.IO.FileInfo]$SchemaDefinitionPath).Name) $($Script:EmojiDictionary.Lightning)"
            $SchemaDefinition = Get-Content -Path $SchemaDefinitionPath -Raw
            $SchemaObject = [Newtonsoft.Json.Schema.JSchema, Newtonsoft.Json.Schema, Version = 2.0.0.0, Culture = neutral, PublicKeyToken = 30ad4fe6b2a6aeed]::Parse($SchemaDefinition)

            Write-Host "Processing properties"
            $Settings = [Newtonsoft.Json.JsonSerializerSettings, Newtonsoft.Json, Version=9.0.0.0, Culture=neutral, PublicKeyToken=30ad4fe6b2a6aeed]::new()
            $Settings.MaxDepth = 100
            $Schema = Expand-Schema -PropertyObject $SchemaObject.Properties
            Write-Verbose -Message "$($Schema.GetType()) "
            Write-Verbose -Message ($Schema | ConvertTo-Json -Depth 10)
            $Configuration = ($Schema | ConvertTo-Json -Depth 10)

            Write-Output $Configuration
    }
    catch {
        Write-Error -Message "$_" -ErrorAction Stop
    }
    finally {
        Trace-VstsLeavingInvocation $MyInvocation
    }
}