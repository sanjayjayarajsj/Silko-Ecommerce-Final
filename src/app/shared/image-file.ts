// Turns a File the user picked (from a file input) into a resized,
// compressed base64 data: URL - because this project's backend is
// json-server (no real file storage), so an "uploaded image" has to end
// up as a string stored directly in the JSON record, same as a typed
// image URL would.
//
// Resizing/compressing client-side (via canvas) before it ever becomes a
// string keeps db.json from ballooning: a multi-MB phone photo becomes a
// ~30-80 KB data URL instead of several MB of base64 text.

export interface ImageFileError {
  message: string;
}

const MAX_SOURCE_FILE_SIZE = 10 * 1024 * 1024; // 10 MB, before resizing

export function validateImageFile(file: File): ImageFileError | null {
  if (!file.type.startsWith('image/')) {
    return { message: 'Please choose an image file (JPG, PNG, WEBP...).' };
  }
  if (file.size > MAX_SOURCE_FILE_SIZE) {
    return { message: 'That image is too large. Please choose one under 10 MB.' };
  }
  return null;
}

export function fileToResizedDataUrl(
  file: File,
  maxDimension: number,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Could not read that file.'));

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => reject(new Error('Could not read that image.'));

      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height / width) * maxDimension);
            width = maxDimension;
          } else {
            width = Math.round((width / height) * maxDimension);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not process that image.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}