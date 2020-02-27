#!/bin/bash

convert \
    mainland-hubei.png -append \
    mainland-hubei-daily.png -append \
    mainland-ex-hubei.png -append \
    mainland-ex-hubei-daily.png -append \
    mainland.png
convert \
    world-ex-mainland-china.png -append \
    world-ex-mainland-china-daily.png -append \
    compare1-daily.png -append \
    world.png
