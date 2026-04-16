/**
 * 이미지 파일을 지정된 최대 너비/높이에 맞게 리사이징하고 JPEG로 변환합니다.
 * 원본 비율을 유지하며, 이미 작은 이미지는 그대로 반환합니다.
 */
export async function resizeImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1800,
  quality = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(img.src);

      let { width, height } = img;

      // 이미 충분히 작으면 그대로 반환
      if (width <= maxWidth && height <= maxHeight) {
        resolve(file);
        return;
      }

      // 비율 유지하며 축소
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Image conversion failed"));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Image load failed"));
    };

    img.src = URL.createObjectURL(file);
  });
}
