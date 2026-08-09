import sys
import json
import numpy as np
from PIL import Image
from scipy.ndimage import label
from sklearn.cluster import MiniBatchKMeans

def segment_image(image_path, num_clusters=12, min_size=200):
    try:
        # Load and resize image for faster processing
        img = Image.open(image_path)
        img.thumbnail((800, 800))
        img_arr = np.array(img)
        
        h, w = img_arr.shape[:2]
        
        # Reshape to pixels
        pixels = img_arr.reshape(-1, 3)
        
        # Run K-Means
        kmeans = MiniBatchKMeans(n_clusters=num_clusters, random_state=42, batch_size=2048)
        labels = kmeans.fit_predict(pixels)
        label_im = labels.reshape(h, w)
        
        regions = []
        region_id = 0
        
        # Extract connected components for each cluster
        for c in range(num_clusters):
            mask = (label_im == c)
            labeled_mask, num_features = label(mask)
            
            for f in range(1, num_features + 1):
                feature_mask = (labeled_mask == f)
                area = int(np.sum(feature_mask))
                
                # Filter out tiny regions (noise)
                if area < min_size:
                    continue
                
                # Get bounding box
                rows = np.any(feature_mask, axis=1)
                cols = np.any(feature_mask, axis=0)
                ymin, ymax = np.where(rows)[0][[0, -1]]
                xmin, xmax = np.where(cols)[0][[0, -1]]
                
                # Compute centroid
                cy, cx = np.mean(np.argwhere(feature_mask), axis=0)
                
                # Compress mask using simple RLE or coordinates
                # We can store the mask as a list of runs: [row, col_start, col_end] to keep it small
                runs = []
                for r in range(ymin, ymax + 1):
                    row_mask = feature_mask[r, xmin:xmax + 1]
                    in_run = False
                    start = 0
                    for c_idx, val in enumerate(row_mask):
                        if val and not in_run:
                            start = xmin + c_idx
                            in_run = True
                        elif not val and in_run:
                            runs.append([int(r), int(start), int(xmin + c_idx - 1)])
                            in_run = False
                    if in_run:
                        runs.append([int(r), int(start), int(xmax)])
                
                regions.append({
                    "id": int(region_id),
                    "area": int(area),
                    "bbox": [int(xmin), int(ymin), int(xmax - xmin + 1), int(ymax - ymin + 1)],
                    "centroid": [float(cx), float(cy)],
                    "runs": runs
                })
                region_id += 1
                
        print(json.dumps({
            "status": "success",
            "width": int(w),
            "height": int(h),
            "regions": regions
        }))
        
    except Exception as e:
        print(json.dumps({
            "status": "error",
            "message": str(e)
        }))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Missing image path arguments"}))
    else:
        segment_image(sys.argv[1])
