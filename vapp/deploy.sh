#!/bin/bash




token=$1
url=$2
tag=1


npm run build

docker build . -t cr.yandex/crpg11k469bhc8lch9gm/overnight/dapp:$tag


docker login \
         --username oauth \
         --password $token \
        cr.yandex

docker push  cr.yandex/crpg11k469bhc8lch9gm/overnight/dapp:$tag


ssh $url docker login \
         --username oauth \
         --password $token \
        cr.yandex

ssh $url docker pull cr.yandex/crpg11k469bhc8lch9gm/overnight/dapp:$tag
ssh $url docker-compose -f /root/docker/docker-compose.yaml up -d --no-deps overnight-dapp


ssh $url docker logs overnight-dapp -f


