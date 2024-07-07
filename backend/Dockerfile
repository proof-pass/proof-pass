FROM golang:1.21 AS build
WORKDIR /go/src
COPY util ./util
COPY jwt ./jwt
COPY openapi ./openapi
COPY server ./server
COPY service ./service
COPY repos ./repos
COPY main.go .
COPY go.sum .
COPY go.mod .

ENV CGO_ENABLED=0

RUN go build -o app .

# CA Certificates stage
FROM golang:1.21 AS certs
RUN apt-get update && apt-get install -y ca-certificates

FROM scratch AS runtime
COPY --from=build /go/src/app ./
COPY --from=certs /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
EXPOSE 8080/tcp
ENTRYPOINT ["./app"]
