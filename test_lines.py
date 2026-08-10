import cv2
import numpy as np

# Load the screenshot
img = cv2.imread('/tmp/map_graticule_test.png')
if img is None:
    print("Could not read image /tmp/map_graticule_test.png")
else:
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Look for near-white pixels
    _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
    
    # Detect lines using HoughLinesP
    lines = cv2.HoughLinesP(thresh, 1, np.pi/180, threshold=100, minLineLength=50, maxLineGap=10)
    
    if lines is not None:
        print(f"Found {len(lines)} white-ish lines!")
        for line in lines[:5]:
            x1, y1, x2, y2 = line[0]
            print(f"Line from ({x1}, {y1}) to ({x2}, {y2})")
    else:
        print("No lines detected.")
