# syntax=docker/dockerfile:1

# Use nightly or stable depending on edition (2024 requires nightly)
FROM rustlang/rust:nightly-bookworm as builder

WORKDIR /app

# Copy full workspace (Cargo.toml includes [workspace] and member paths)
COPY . .

# Build only the api-service binary
RUN cargo +nightly build --release -p api-service

# Runtime stage
FROM debian:bookworm-slim

# PostgreSQL client libs if needed at runtime
RUN apt-get update && apt-get install -y libpq5 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the compiled binary
COPY --from=builder /app/target/release/api-service /app/api-service

ENTRYPOINT ["/app/api-service"]
