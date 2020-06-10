## Running task locally
Refer to https://docs.microsoft.com/en-us/azure/devops/extend/develop/add-build-task?view=azure-devops for requirements to run Azure DevOps typescript tasks.

In order to run the task locally, create a file named .env in the tasks/DependencyCheck/task folder.

Populate contents of the .env for each of the task parameters, referring to the tasks/DependencyCheck/task/task.json for the parameters needed.

### Format of .env file
```
<parameter 1 name>=<parameter 1 value>
...
<parameter n name>=<parameter n value>
```
