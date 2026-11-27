#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <original-acoustic1-dir> <output-dir>" >&2
  exit 2
fi

src_dir=$(cd -- "$1" && pwd)
mkdir -p -- "$2"
out_dir=$(cd -- "$2" && pwd)
if [[ "$src_dir" == "$out_dir" ]]; then
  echo 'Source and output directories must differ.' >&2
  exit 2
fi

voices=(Kick SnareOn1 SnareOn2 SnareOff CrossStick HHClosed1 HHClosed2 HHOpen HHFoot HiTom FloorTom Crash Ride RideBell)
for voice in "${voices[@]}"; do
  if [[ ! -f "$src_dir/acoustic-$voice.ogg" ]]; then
    echo "Missing source: $src_dir/acoustic-$voice.ogg" >&2
    exit 1
  fi
done

for voice in "${voices[@]}"; do
  stem="acoustic-$voice"
  channels=1
  bitrate=64k
  filters=()
  case "$voice" in
    Crash)    filters=(-af 'atrim=duration=5,afade=t=out:st=4.6:d=0.4') ;;
    Ride)     filters=(-af 'atrim=duration=4.5,afade=t=out:st=4.1:d=0.4') ;;
    RideBell) filters=(-af 'atrim=duration=3.5,afade=t=out:st=3.1:d=0.4') ;;
    HHOpen)   filters=(-af 'atrim=duration=2.5,afade=t=out:st=2.1:d=0.4') ;;
  esac
  if (( ${#filters[@]} )); then
    channels=2
    bitrate=96k
  fi

  ffmpeg -nostdin -hide_banner -loglevel error -y -i "$src_dir/$stem.ogg" \
    "${filters[@]}" -ac "$channels" -ar 44100 -c:a libvorbis -q:a 3 -fflags +bitexact "$out_dir/$stem.ogg" \
    "${filters[@]}" -ac "$channels" -ar 44100 -c:a aac -b:a "$bitrate" "$out_dir/$stem.m4a"
done
