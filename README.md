# Proof Pass

## Overview

This is the monorepo for the Proof Pass system. This project aim to:

1. Bridge gap of email-based ticketing and ZK ticket verification.
2. Allow users to check-in to events without revealing any personal information.

## Galxe Identity Protocol

The Proof Pass system is built on top of the Galxe Identity Protocol. Ticket are issued as
[credentials](https://docs.galxe.com/identity/specification/credential-format) and the proof
user generated are used as tickets at the event.

## Project Structure

### Frontend

The frontend is a Next.js application that provides the user interface for the Proof Pass system.

### Backend

The backend is a Go-based HTTP server that handles the server-side logic for the application.

### OpenAPI

The openapi folder contains the OpenAPI specification for the Proof Pass system.

### Infrastructure

The infra folder contains Kubernetes manifests for deploying the application.

## Development

### Prerequisites

- docker
- kubectl
- minikube
- [skaffold](http://skaffold.dev)
- [openapi-generator](https://github.com/OpenAPITools/openapi-generator)

## Running the Application Locally

### Use minikube to start local cluster

```
minikube start --profile zk-ticketing
skaffold config set --global local-cluster true
eval $(minikube -p zk-ticketing docker-env)
```

### Run skaffold in local development mode

```
skaffold -p local dev
```

### Access the application

Port-forward backend, frontend, postgres db:

```
kubectl port-forward -n app svc/backend 3000:3000
kubectl port-forward -n app svc/frontend 8080:8080
kubectl port-forward -n app svc/postgres 5432:5432
```

Once the tunnel is running, you can:

- access frontend at: http://localhost:8080
- access backend at: http://localhost:3000
- access db using any postgres client (e.g. pgAdmin, DBeaver, etc.) with the following credentials (for local development only:
  - Host: localhost
  - Port: 5432
  - Username: postgres
  - Password: password

### Open Swagger UI to test the API

In a new terminal, run the following command:

```
make start-swagger-ui
```

Then open the Swagger UI at http://localhost:8081 to test the API against our forwarded backend port.
