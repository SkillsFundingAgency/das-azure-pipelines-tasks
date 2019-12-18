InModuleScope "Handlers" {

    Describe "Get-SchemaProperty tests" {

        BeforeAll {
            Set-MockEnvironment
            Add-DefaultMocks
        }

        AfterAll {
            Clear-MockEnvironment
        }

        $SchemaDefinitionPath = "$PSScriptRoot/resource/SFA.DAS.Test.schema.json"
        $SchemaDefinition = Get-Content -Path $SchemaDefinitionPath -Raw
        $SchemaObject = [Newtonsoft.Json.Schema.JSchema, Newtonsoft.Json.Schema, Version = 2.0.0.0, Culture = neutral, PublicKeyToken = 30ad4fe6b2a6aeed]::Parse($SchemaDefinition)


        Context "When given a valid properties object" {

            It "Should return a string when no parameters are passed" {
                Mock Get-VstsTaskVariable { return "default-string" }
                $Property = Get-SchemaProperty -PropertyObject $SchemaObject.Properties["PaymentsString"]
                $Property | Should BeOfType [string]
                Assert-MockCalled -CommandName Get-VstsTaskVariable -Times 1
            }

            It "Should return an int when -AsInt is passed" {
                Mock Get-VstsTaskVariable { return "1" }
                $Property = Get-SchemaProperty -PropertyObject $SchemaObject.Properties["PaymentsInt"] -AsInt
                $Property | Should BeOfType [int]
                Assert-MockCalled -CommandName Get-VstsTaskVariable -Times 1
            }

            It "Should return a decimal when -AsNumber is passed" {
                Mock Get-VstsTaskVariable { return "1.0" }
                $Property = Get-SchemaProperty -PropertyObject $SchemaObject.Properties["PaymentsNumber"] -AsNumber
                $Property | Should BeOfType [decimal]
                Assert-MockCalled -CommandName Get-VstsTaskVariable -Times 1
            }

            It "Should return an array when -AsArray is passed" {

                Mock Get-VstsTaskVariable { return "['one','two','three']" }
                $Property = Get-SchemaProperty -PropertyObject $SchemaObject.Properties["PaymentsArray"] -AsArray
                $Property.GetType().BaseType.Name | Should Be 'Array'
                Assert-MockCalled -CommandName Get-VstsTaskVariable -Times 1
            }

            It "Should return an bool when -AsBool is passed" {
                Mock Get-VstsTaskVariable { return "True" }
                $Property = Get-SchemaProperty -PropertyObject $SchemaObject.Properties["PaymentsBool"] -AsBool
                $Property | Should BeOfType [bool]
                Assert-MockCalled -CommandName Get-VstsTaskVariable -Times 1
            }

            It "Should return the default value if no environment variable can be found and the default property is populated" {
                Mock Get-VstsTaskVariable { return $null }
                $Property = Get-SchemaProperty -PropertyObject $SchemaObject.Properties["PaymentsDefaultValue"]
                $Property | Should Be "default-value"
                Assert-MockCalled -CommandName Get-VstsTaskVariable -Times 5
            }

            It "Should throw an exception if no value can be found" {
                Mock Get-VstsTaskVariable { return $null }
                { Get-SchemaProperty -PropertyObject $SchemaObject.Properties["PaymentsString"] } | Should Throw
                Assert-MockCalled -CommandName Get-VstsTaskVariable -Times 5
            }
        }
    }
}
