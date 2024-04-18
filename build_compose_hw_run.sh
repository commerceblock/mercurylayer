set -e

docker volume create --driver local --opt type=tmpfs --opt device=tmpfs --opt o=rw aesmd-socket

docker compose -f docker-compose-hw.yml up --build
