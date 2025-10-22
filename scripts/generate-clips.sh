
##################################
# file renaming
#
# 1.一ツ勝.mp4        -> 01.mp4
# 06.07. 二ツ勝.mp4   -> 06.07.mp4
# 36.37.38. 巻返.mp4  -> 36.37.38.mp4
# 42.. 裏切.mp4       -> 42.mp4
# 45... 早切替.mp4    -> 45.mp4
# 49.50_余.mp4        -> 49.50.mp4
##################################
for f in *.mp4; do
  # 1. extract leading digits & dots
  prefix="${f%%[^0-9.]*}"

  # 2. collapse multiple dots to a single dot
  prefix="${prefix//../.}"

  # 3. strip leading and trailing dots (if any)
  prefix="${prefix#.}"
  prefix="${prefix%.}"

  # 4. print or rename
  echo "${prefix}.mp4"
  # mv -n "$f" "${prefix}.mp4" # uncomment to actually rename
done


# scale down and speed up (320px wide, 3x speed, 20fps, H264 baseline)
for f in *.mp4; do
  base="${f##*/}"                     # strip path (if any)
  out="out/$base"                     # output file path (same name inside 'out')

  echo ">> Processing $f → $out"

  ffmpeg -y -i "$f" \
    -filter:v "setpts=0.333*PTS,fps=20,scale=320:-2:flags=lanczos" \
    -c:v libx264 -crf 28 -preset slow -profile:v baseline -level 3.0 \
    -pix_fmt yuv420p -g 20 -keyint_min 20 -sc_threshold 0 \
    -movflags +faststart \
    -an \
    "$out"
done

# File summary
# Files: 30, Total: 18790400 bytes, Average: 626347 bytes
ls -l *.mp4 | awk '{sum += $5; n++} END {printf "Files: %d, Total: %d bytes, Average: %.0f bytes\n", n, sum, sum/n}'


# Quick A/B ladder test with different CRF values
# (320px wide, 20fps, H264 baseline)
for c in 26 28 30 32; do
  ffmpeg -y -i sample.mp4 \
    -vf "scale=320:-2:flags=lanczos,fps=20" \
    -c:v libx264 -crf $c -preset slow -profile:v baseline -level 3.0 \
    -pix_fmt yuv420p -g 20 -keyint_min 20 -sc_threshold 0 \
    -movflags +faststart -an \
    "sample_crf${c}.mp4"
  ls -lh "sample_crf${c}.mp4"
done
