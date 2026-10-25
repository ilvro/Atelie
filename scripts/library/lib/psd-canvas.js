/**
 * Minimal canvas stub for ag-psd in Node.js (Etapa 23)
 * ag-psd requires a canvas implementation even when only extracting ImageData;
 * this stub provides an in-memory ImageData provider without native canvas dependencies.
 */
import { initializeCanvas } from 'ag-psd';

const imageData = (width, height) => ({
  width,
  height,
  data: new Uint8ClampedArray(width * height * 4),
});

/**
 * ag-psd asks for a canvas even when it only fills ImageData; this one does just that.
 */
export function useImageDataCanvas() {
  initializeCanvas(
    (width, height) => ({
      width,
      height,
      getContext: () => ({
        createImageData: imageData,
        putImageData() {},
        getImageData: (x, y, w, h) => imageData(w, h),
        drawImage() {},
      }),
    }),
    imageData
  );
}

