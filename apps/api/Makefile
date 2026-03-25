.PHONY: build run dev lint vet test clean tidy

build: download-go-deps
	@echo "+++ Builds"
	go build \
		-o ./build/api \
		-mod readonly \
		-ldflags "-X main.version=$(VERSION)" \
		./cmd/api

dev:
	go run ./cmd/api/main.go

lint:
	golangci-lint run ./...

vet:
	go vet ./...

test:
	go test ./...

clean:
	rm -rf ./build

tidy:
	go mod tidy

download-go-deps:
	@echo -e "\n--- Download go deps"
	go mod download -x all
