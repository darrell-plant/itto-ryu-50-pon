# 512×512
magick -size 512x512 xc:black \
  -gravity center -font "Hiragino-Sans-W6" -interline-spacing 10 \
  -define gradient:angle=45 \
  -fill "gradient:#FFBBFF-#8A2BE2" \
  -pointsize 128 -annotate +0-60 "大太刀" \
  -pointsize 112 -annotate +0+80 "50本" \
  icon-512.png

# 192×192
magick -size 192x192 xc:black \
  -gravity center -font "Hiragino-Sans-W6" -interline-spacing 6 \
  -define gradient:angle=45 \
  -fill "gradient:#FFBBFF-#8A2BE2" \
  -pointsize 50 -annotate +0-24 "大太刀" \
  -pointsize 40  -annotate +0+30 "50本" \
  icon-192.png