FROM alpine:latest

WORKDIR /app

COPY ../keylistCron/send_commitment.sh .
COPY ../keylistCron/crontab.txt .

RUN chmod +x /app/send_commitment.sh

# CMD to run cron and keep container running
CMD ["sh", "-c", "crontab ./crontab.txt && tail -f /dev/null"]
