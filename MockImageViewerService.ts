import {ImageViewerService} from "./ImageViewerService";
import * as Logger from "bunyan";
import {createLogger} from "../unisonht/lib/Log";

export class MockImageViewerService implements ImageViewerService {
  private log: Logger;

  constructor() {
    this.log = createLogger('MockImageViewerService');
  }

  displayImage(image: string): Promise<void> {
    this.log.info(`displayImage ${image}`);
    return Promise.resolve();
  }

  off(): Promise<void> {
    this.log.info('off');
    return Promise.resolve();
  }
}
