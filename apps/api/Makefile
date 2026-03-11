.PHONY: build run dev lint vet test clean tidy

build:
	go build -o bin/api ./cmd/...

run: build
	./bin/api

dev:
	go run ./cmd/main.go

lint:
	golangci-lint run ./...

vet:
	go vet ./...

test:
	go test ./...

clean:
	rm -f bin/api

tidy:
	go mod tidy
