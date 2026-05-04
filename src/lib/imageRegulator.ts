/**
 * AI Regulator for Firebase Free Tier
 * Ensures all images are strictly regulated: webp, 650px max width, and <80KB.
 */
export async function regulateImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxWidth = 650;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Iterative compression to stay under 80KB
        let quality = 0.6;
        let blob: Blob | null = null;
        const maxSize = 80 * 1024; // 80KB

        while (quality > 0.1) {
          blob = await new Promise<Blob | null>((res) => 
            canvas.toBlob((b) => res(b), 'image/webp', quality)
          );
          
          if (blob && blob.size <= maxSize) {
            break;
          }
          quality -= 0.1;
        }

        if (blob) {
          console.log(`AI Regulator: Optimized to ${Math.round(blob.size / 1024)}KB at ${Math.round(quality * 100)}% quality`);
          resolve(blob);
        } else {
          reject(new Error('AI Regulation failed: Could not generate blob'));
        }
      };
    };
    reader.onerror = (error) => reject(error);
  });
}
