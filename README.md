# <span style="color:red">**DEPRECATED**</span>

## The Environment Configuration Azure DevOps task has been superceeded by the Azure DevOps Pipeline generate-config step template found [here](https://github.com/SkillsFundingAgency/das-platform-building-blocks/blob/master/azure-pipelines-templates/deploy/step/generate-config.yml).
## This repo exists to support legacy release definitions only.



# Azure Pipelines tasks

This repository contains custom Azure Pipelines tasks.

## Creating new tasks

When creating a new task follow the [official documentation](https://docs.microsoft.com/en-us/azure/devops/extend/develop/add-build-task?view=azure-devops).

You can also use the [schema](https://github.com/Microsoft/azure-pipelines-task-lib/blob/master/tasks.schema.json) provided by Microsoft when building your `task.json` definition.

If your task has external dependencies ensure that you include a `dependency.json` file in the root of the task directory. The following dependency sources are supported:

* GitHub
* PowerShell Gallery
* NuGet

Use [this file](tasks/EnvironmentConfiguration/dependency.json) as a reference when building your `dependency.json`.

## Building locally

```PowerShell
./BuildTask.ps1 -TaskRoot tasks/MyTask
```

## Building in Azure DevOps

Create an `azure-pipelines.yml` in the root of your task directory and reference `azure-pipelines.template.json` from the root of the repository. Use [this file](tasks/EnvironmentConfiguration/azure-pipelines.yml) as a reference.  You will need to create a Service Connection for Visual Studio Marketplace that uses a PAT token for authentication.  The PAT token will need the following properties:
* Organization: All accessible organizations
* Scope: Marketplace Read and Publish
