import cv2
import numpy as np

def get_lines(path):
    img = cv2.imread(path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
    lines = cv2.HoughLinesP(thresh, 1, np.pi/180, threshold=100, minLineLength=50, maxLineGap=10)
    res = []
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            # normalize direction so it's comparable
            if x1 > x2 or (x1 == x2 and y1 > y2):
                x1, y1, x2, y2 = x2, y2, x1, y1
            res.append((x1, y1, x2, y2))
    return set(res)

local_lines = get_lines('/tmp/map_new.png')
live_lines = get_lines('/tmp/geobounds_live.png')

diff = local_lines - live_lines
print(f"Extra lines in local: {len(diff)}")
if len(diff) > 0:
    print(list(diff)[:10])
