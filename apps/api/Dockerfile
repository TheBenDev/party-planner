FROM golang:1.26 AS builder

WORKDIR /app

COPY go.mod go.sum Makefile ./
RUN make download-go-deps

COPY . .
RUN make build

FROM gcr.io/distroless/base-debian12:nonroot-amd64

COPY --from=builder /app/build/api ./api

CMD ["./api"]
