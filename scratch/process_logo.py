import os
import numpy as np
from PIL import Image

src_path = r"C:\Users\Rahul\.gemini\antigravity-ide\brain\fde9b0a0-380c-4cbf-9f49-39dec6bdf921\.user_uploaded\media_1790082043067.jpg"
out_dir = r"c:\Users\Rahul\OneDrive\Desktop\nagarpalikaProject-main\My project\Search_engine\frontend\public"
os.makedirs(out_dir, exist_ok=True)

img = Image.open(src_path).convert("RGBA")
img.save(os.path.join(out_dir, "logo-original.png"))

# Convert to numpy array
arr = np.array(img, dtype=np.float32)
r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]

# Calculate difference from white (255, 255, 255)
diff_from_white = np.maximum.reduce([255 - r, 255 - g, 255 - b])

# Smooth alpha transparency mask:
# If diff_from_white < 5: completely transparent
# If diff_from_white > 35: completely opaque
# In between: smooth ramp
alpha = np.clip((diff_from_white - 4.0) / 28.0, 0.0, 1.0) * 255.0

# De-multiply white background color fringing:
# C_clean = (C_orig - 255 * (1 - alpha)) / alpha
alpha_norm = np.maximum(alpha / 255.0, 1e-4)
r_clean = np.clip((r - 255.0 * (1.0 - alpha_norm)) / alpha_norm, 0.0, 255.0)
g_clean = np.clip((g - 255.0 * (1.0 - alpha_norm)) / alpha_norm, 0.0, 255.0)
b_clean = np.clip((b - 255.0 * (1.0 - alpha_norm)) / alpha_norm, 0.0, 255.0)

transparent_arr = np.dstack([r_clean, g_clean, b_clean, alpha]).astype(np.uint8)
transparent_img = Image.fromarray(transparent_arr, "RGBA")

# Save full transparent logo
transparent_img.save(os.path.join(out_dir, "logo-full.png"))

# Crop emblem only (the 'S' ribbon with magnifying glass and data cubes)
# Emblem is roughly from top y=100 to y=700, x=200 to x=820
# Find bounding box of emblem by analyzing upper 72% of image
upper_arr = transparent_arr[:720, :, :]
upper_alpha = upper_arr[:, :, 3]
y_indices, x_indices = np.where(upper_alpha > 30)

if len(y_indices) > 0 and len(x_indices) > 0:
    min_y, max_y = y_indices.min(), y_indices.max()
    min_x, max_x = x_indices.min(), x_indices.max()

    # Add small padding
    pad = 16
    min_y = max(0, min_y - pad)
    min_x = max(0, min_x - pad)
    max_y = min(720, max_y + pad)
    max_x = min(1024, max_x + pad)

    # Make square bounding box for clean icon scaling
    width = max_x - min_x
    height = max_y - min_y
    size = max(width, height)
    center_x = (min_x + max_x) // 2
    center_y = (min_y + max_y) // 2

    square_box = (
        max(0, center_x - size // 2),
        max(0, center_y - size // 2),
        min(1024, center_x + size // 2),
        min(1024, center_y + size // 2),
    )

    emblem_img = transparent_img.crop(square_box)
    emblem_img.save(os.path.join(out_dir, "logo-icon.png"))

    # Save favicon sizes
    fav_128 = emblem_img.resize((128, 128), Image.Resampling.LANCZOS)
    fav_128.save(os.path.join(out_dir, "favicon.png"))
    fav_128.save(os.path.join(out_dir, "favicon-128.png"))

    fav_64 = emblem_img.resize((64, 64), Image.Resampling.LANCZOS)
    fav_64.save(os.path.join(out_dir, "favicon-64.png"))

    fav_32 = emblem_img.resize((32, 32), Image.Resampling.LANCZOS)
    fav_32.save(os.path.join(out_dir, "favicon-32.png"))

    # Also save as favicon.ico
    emblem_img.save(
        os.path.join(out_dir, "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128)],
    )

print("Successfully generated all logo assets in frontend/public!")
