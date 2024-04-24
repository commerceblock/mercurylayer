# Usage

## Simulation mode

### Bulid and run docker containers

```bash
$ cd mercurylayer
$ docker compose -f docker-compose-sim.yml up --build
```
### Add mmnemonics

```bash
$ docker exec -it mercurylayer-enclave-sgx-1 bash
$ curl -X POST http://0.0.0.0:18080/add_mnemonic \
-H "Content-Type: application/json" \
-d '{
    "mnemonic": "achieve merry hidden lyrics element brand student armed dismiss vague fury avocado grief crazy garlic gallery blur spider bag bless motor crawl surround copper",
    "password": "b1gHKyfXTzs6",
    "index": 0,
    "threshold": 2
}'
```

## Hardware Mode

```bash
$ cd mercurylayer
$ ./build_compose_hw_run.sh
```

Add mnemonics in the same way as above.

## Compose down

`docker compose -f docker-compose-sim.yml down -v` in simulation mode

`docker compose -f docker-compose-hw.yml down -v` in hardware mode
