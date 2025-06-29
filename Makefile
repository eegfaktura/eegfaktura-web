# NPM parameters

NPMCMD=npm
NPMBUILD=$(NPMCMD) run build

BINARY_NAME=vfeeg-web
DOCKER=docker
VERSION=v0.2.28
ORGANISATION=vfeeg-development
GLOBAL_ORG=eegfaktura

PLATFORM=ghcr.io

all: test build
build:
	$(NPMCMD) run build

run:
	$(NPMCMD) run build

docker-clean:
	$(DOCKER) rmi ghcr.io/$(ORGANISATION)/$(BINARY_NAME):$(VERSION)

docker: build
	$(DOCKER) build -t ghcr.io/$(ORGANISATION)/$(BINARY_NAME):$(VERSION) .
	$(DOCKER) image tag ghcr.io/$(ORGANISATION)/$(BINARY_NAME):$(VERSION) ghcr.io/$(GLOBAL_ORG)/$(BINARY_NAME):latest

push: docker
	$(DOCKER) push ghcr.io/$(ORGANISATION)/$(BINARY_NAME):$(VERSION)
	$(DOCKER) push ghcr.io/$(GLOBAL_ORG)/$(BINARY_NAME):latest
