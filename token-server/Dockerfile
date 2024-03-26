FROM rust:1.77.0

# Set working directory
WORKDIR /app/lib
COPY ../lib .

# Copy the project code
WORKDIR /app
COPY . .

RUN cargo build --release

# Run the application
CMD ["cargo", "run"]
