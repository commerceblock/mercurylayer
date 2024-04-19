FROM alpine:latest

RUN apk update && apk add --no-cache curl
WORKDIR /app

COPY ./send_commitment.sh .

RUN chmod +x /app/send_commitment.sh

# CMD to run cron and keep container running
CMD ["sh", "send_commitment.sh"]
