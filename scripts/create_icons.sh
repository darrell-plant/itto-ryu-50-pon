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

# favicons: make smaller PNGs
magick icons/icon-512.png -resize 32x32 icons/icon-32.png
magick icons/icon-512.png -resize 16x16 icons/icon-16.png

# optional but good for legacy browsers: multi-size .ico
magick icons/icon-512.png -define icon:auto-resize=256,128,64,48,32,16 favicon.ico
