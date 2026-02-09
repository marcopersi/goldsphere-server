# CI/CD

## Overview

The CI pipeline runs linting, type checking, copy-paste detection (jscpd), build, tests, and then builds and publishes the Docker image.

The Docker image is published to GitHub Container Registry (GHCR):

- Image: ghcr.io/<owner>/goldsphere-server
- Tags: <version> and latest (on release)

## Publishing to GHCR

The publish job runs after a successful semantic release on pushes to main. It logs in to GHCR using the built-in GitHub Actions token and pushes the image.

Required repository settings:

- Actions workflow permissions: Read and write
- Package visibility: set to public if you want anonymous pulls

## Pulling the image

Example pull command:

```bash
docker pull ghcr.io/<owner>/goldsphere-server:latest
```

## Troubleshooting

- If the publish job fails with auth errors, verify Actions workflow permissions and that the workflow has packages: write.
- If pulls fail with 403, check the package visibility or authenticate with a token that has read:packages.

## Releases (Conventional Commits)

Releases are created automatically based on Conventional Commits. The release job:

- Analyzes commit messages on main
- Creates a Git tag and GitHub Release when a new version is required
- Triggers the Docker publish job, which pushes two tags: <version> and latest

### Release outputs

- Git tag: v<version>
- GitHub Release: generated notes from commit history
- GHCR image tags: <version> and latest

### Pulling a specific release

```bash
docker pull ghcr.io/<owner>/goldsphere-server:<version>
```

Example Conventional Commit messages:

```text
feat: add new custody provider integration
fix: handle empty portfolio response
feat!: remove deprecated payment endpoint
```
