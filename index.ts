import {Device, DeviceOptions} from "unisonht/lib/Device";

interface ImageViewerOptions extends DeviceOptions {
  images: {
    [key: string]: string;
  }
}

export default class ImageViewer extends Device {
  constructor(options: ImageViewerOptions) {
    super(options);
  }
}