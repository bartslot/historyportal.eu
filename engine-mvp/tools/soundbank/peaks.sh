#!/bin/sh
# Decoded peak of every file in the bank (dBFS). Every line must be below 0; make_bank.py aims for about -3.
cd "${1:-$HOME/BartsMedia/historyportal/sound}" || exit 1
for f in beds/*.m4a sfx/*.m4a; do
  p=$(ffmpeg -hide_banner -i "$f" -af astats=metadata=0 -f null - 2>&1 | grep "Peak level dB" | tail -1 | awk '{print $NF}')
  echo "$p $f"
done
