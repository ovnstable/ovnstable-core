#!/bin/bash
export NODE_OPTIONS=--max_old_space_size=18192
# ganache -m "clutch captain shoe salt awake harvest setup primary inmate ugly among become" -f 'https://polygon-mainnet.infura.io/v3/753a98a2eb6c4d64918829f47d069440' -u 0xa0df350d2637096571F7A701CBc1C5fdE30dF76A --db ./ganache_poly  -p 8555 -g 20 -e 10000000
# ganache-cli -m "clutch captain shoe salt awake harvest setup primary inmate ugly among become" -f 'https://polygon-mainnet.infura.io/v3/753a98a2eb6c4d64918829f47d069440' -u 0xa0df350d2637096571F7A701CBc1C5fdE30dF76A --db ./ganache_poly  -p 8555 -g 20 -e 10000000 -l 99999999
ganache-cli -m "clutch captain shoe salt awake harvest setup primary inmate ugly among become" -f 'https://polygon-mainnet.infura.io/v3/753a98a2eb6c4d64918829f47d069440' -u 0xa0df350d2637096571F7A701CBc1C5fdE30dF76A --db ./ganache_poly  -p 8555 -g 30000000009 -e 10000000
