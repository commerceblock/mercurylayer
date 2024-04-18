# Usage

## Simulation mode

### Bulid and run docker containers

```bash
$ cd mercurylayer
$ docker compose build
$ docker compose up
```
### Add mmnemonics

```bash
$ docker exec -it mercurylayer-enclave-sgx bash
$ curl -X POST http://0.0.0.0:18080/add_mnemonic \
-H "Content-Type: application/json" \
-d '{
    "mnemonic": "achieve merry hidden lyrics element brand student armed dismiss vague fury avocado grief crazy garlic gallery blur spider bag bless motor crawl surround copper",
    "password": "b1gHKyfXTzs6",
    "index": 0,
    "threshold": 2
}'
```