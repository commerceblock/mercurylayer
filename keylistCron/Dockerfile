FROM alpine:latest

# Define build arguments
ARG DB_HOST
ARG DB_PORT
ARG DB_NAME
ARG DB_USER
ARG DB_PASSWORD

# Set environment variables
ENV DB_HOST=$DB_HOST
ENV DB_PORT=$DB_PORT
ENV DB_NAME=$DB_NAME
ENV DB_USER=$DB_USER
ENV DB_PASSWORD=$DB_PASSWORD

RUN apk update && apk add --no-cache curl postgresql-client jq
WORKDIR /app

COPY ../keylistCron/send_commitment.sh .

RUN chmod +x /app/send_commitment.sh

# CMD to run cron and keep container running
CMD ["sh", "send_commitment.sh"]
