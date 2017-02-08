export interface ImageViewerService {
  displayImage(image: string): Promise<void>;
  off(): Promise<void>;
}