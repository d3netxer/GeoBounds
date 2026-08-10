import cv2
import numpy as np

img = cv2.imread('/Users/tomgertin/.gemini/antigravity/brain/afddb85d-4142-40b9-8a63-a690b08fc666/layout_verify_expand.png')
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
_, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
lines = cv2.HoughLinesP(thresh, 1, np.pi/180, threshold=500, minLineLength=500, maxLineGap=10)

if lines is not None:
    print(f"Found {len(lines)} long lines!")
    for line in lines:
        x1, y1, x2, y2 = line[0]
        if x1 == x2 or y1 == y2: # PERFECT horizontal or vertical
            print(f"Line from ({x1}, {y1}) to ({x2}, {y2})")
else:
    print("No long lines.")
