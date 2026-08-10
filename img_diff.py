import cv2
import numpy as np

# Load images
img1 = cv2.imread('/tmp/geobounds_live.png')
img2 = cv2.imread('/tmp/map_new.png')

# The map is the bottom part of the screen. Let's just compare the whole thing, but ignore the sidebar and top header.
# Assuming sidebar is ~350px left, header is ~80px top.
# Let's just diff the region: x from 400 to 1200, y from 100 to 700
crop1 = img1[100:700, 400:1200]
crop2 = img2[100:700, 400:1200]

diff = cv2.absdiff(crop1, crop2)
gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
_, thresh = cv2.threshold(gray_diff, 50, 255, cv2.THRESH_BINARY)

# Find coordinates of different pixels
coords = np.column_stack(np.where(thresh > 0))
print(f"Number of different pixels: {len(coords)}")

if len(coords) > 0:
    # See if they form lines
    lines = cv2.HoughLinesP(thresh, 1, np.pi/180, threshold=50, minLineLength=50, maxLineGap=10)
    if lines is not None:
        print(f"Found {len(lines)} diff lines!")
        # Print first few
        for line in lines[:10]:
            print(line[0])
    else:
        print("No lines found in the difference.")
