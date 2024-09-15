# NPM parameters

NPMCMD=npm
NPMBUILD=$(NPMCMD) run build

BINARY_NAME=vfeeg-web
DOCKER=docker
VERSION=v0.2.16

all: test build
build:
	$(NPMCMD) run build

run:
	$(NPMCMD) run build

docker-clean:
	$(DOCKER) rmi ghcr.io/vfeeg-development/$(BINARY_NAME):$(VERSION)

docker:
	$(DOCKER) build -t ghcr.io/vfeeg-development/$(BINARY_NAME):$(VERSION) .

push: docker
	$(DOCKER) push ghcr.io/vfeeg-development/$(BINARY_NAME):$(VERSION)
