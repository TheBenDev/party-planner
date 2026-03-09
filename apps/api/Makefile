.PHONY: build run dev lint vet tidy

build:
	go build -o bin/api ./cmd/...

run: build
	./bin/api

dev:
	go run ./cmd/main.go

lint:
	go vet ./...

vet:
	go vet ./...

tidy:
	go mod tidy
