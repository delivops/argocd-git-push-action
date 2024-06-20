![Coverage](badges/coverage.svg)

# Argo CD Git Push GitHub Action

This GitHub Action update your argocd application by pushing the changes to the git repository.

## Features

- Synchronize an Argo CD application by pushing the changes to the git repository.

## Prerequisites

Before you can use this action, you need to have the following: A github repository with the argocd application
configuration files in the following structure on the `main` branch:

```
env/
  your-cluster-name/
    your-project-name/
      your-application-name.yaml

```

Note: folder `env` can have alternative names: `clusters` or `environments`.

## Inputs

Here are the detailed inputs for the action.

| Input        | Description                                                               | Required |
| ------------ | ------------------------------------------------------------------------- | -------- |
| cluster_name | The name of your Kubernetes cluster.                                      | Yes      |
| applications | The name(s) of the Argo CD application(s) to sync (split with ';' or ',') | Yes      |
| project_name | The name of your project                                                  | Yes      |
| tag          | The new tag of your app.                                                  | Yes      |
| github-token | Github token. (default to default github token)                           | No       |
| retries      | Number of retries before fails (default: 1)                               | No       |

## Usage

TODO

## Contributing

Contributions to this project are welcome! Please submit issues and pull requests for any feature enhancements, bug
fixes, or improvements.

## License

MIT
