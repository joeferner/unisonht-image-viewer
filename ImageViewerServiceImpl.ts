import {ImageViewerService} from "./ImageViewerService";
import * as Logger from "bunyan";
import * as path from "path";
import * as child_process from "child_process";
import {createLogger} from "../unisonht/lib/Log";

export class ImageViewerServiceImpl implements ImageViewerService {
  private lastXMouseMove: number;
  private log: Logger;

  constructor() {
    this.lastXMouseMove = 0;
    this.log = createLogger('ImageViewerServiceImpl');
  }

  off(): Promise<void> {
    // TODO kill image viewer
    return Promise.resolve();
  }

  displayImage(image: string): Promise<void> {
    image = path.resolve(image);
    this.log.debug('displaying image: %s', image);
    return this.runPqiv(image)
      .then(() => {
        return this.wakeUp();
      })
      .then(() => {
        return this.bringWindowToTopAsync('pqiv');
      });
  }

  private runPqiv(image: string): Promise<void> {
    return this.run('pqiv', ['-fit', image], false);
  }

  private wakeUp(): Promise<void> {
    this.lastXMouseMove++;
    if (this.lastXMouseMove > 100) {
      this.lastXMouseMove = 0;
    }

    return this.run('xdotool', ['mousemove', this.lastXMouseMove, 0], true);
  }

  private bringWindowToTopAsync(windowString: string): Promise<void> {
    const intervalTimer = setInterval(() => {
      this.run('wmctrl', ['-R', windowString], true)
        .catch((err) => {
          this.log.error('wmctrl error', err);
        });
    }, 100);
    setTimeout(() => {
      clearInterval(intervalTimer);
    }, 5 * 1000);
    return Promise.resolve();
  }

  private run(command: string, args: (any)[], waitForExit: boolean): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const options = {
        env: {
          DISPLAY: ':0.0'
        }
      };
      this.log.debug(`running ${command} ${args}`);
      const cp = child_process.spawn(command, args, options);
      cp.on('error', (err) => {
        return reject(new Error(`Failed to run command: ${command} ${args} ${err}`));
      });

      cp.stdout.on('data', (data) => {
        this.log.debug(`stdout: ${data}`);
      });

      cp.stderr.on('data', (data) => {
        this.log.debug(`stderr: ${data}`);
      });

      if (waitForExit) {
        cp.on('exit', (code) => {
          if (code === 0) {
            return resolve();
          } else {
            return reject(new Error(`Failed to run command: ${command} ${args} (code: ${code})`));
          }
        });
      } else {
        setTimeout(resolve, 500);
      }
    });
  }
}
