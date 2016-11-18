import {Device, DeviceOptions} from "unisonht/lib/Device";
import * as path from "path";
import * as child_process from "child_process";
import createLogger from "unisonht/lib/Log";
const log = createLogger('image-viewer');

interface ImageViewerOptions extends DeviceOptions {
  images: {
    [key: string]: string;
  }
}

export default class ImageViewer extends Device {
  private options: ImageViewerOptions;
  private lastXMouseMove: number;

  constructor(options: ImageViewerOptions) {
    super(options);
    this.lastXMouseMove = 0;
    this.options = options;
  }


  buttonPress(button: string): Promise<void> {
    const image = this.findImageFromButton(button);
    if (image) {
      return this.displayImage(image);
    }
    return super.buttonPress(button);
  }

  private findImageFromButton(button: string) {
    return this.options.images[button];
  }

  private displayImage(image: string): Promise<void> {
    image = path.resolve(image);
    log.debug('displaying image: %s', image);
    return this.runPqiv(image)
      .then(()=> {
        return this.wakeUp();
      })
      .then(()=> {
        return this.bringWindowToTopAsync('pqiv');
      });
  }

  private runPqiv(image: string): Promise<void> {
    return this.run('pqiv', ['-fit', image]);
  }

  private wakeUp(): Promise<void> {
    this.lastXMouseMove++;
    if (this.lastXMouseMove > 100) {
      this.lastXMouseMove = 0;
    }

    return this.run('xdotool', ['mousemove', this.lastXMouseMove, 0]);
  }

  private bringWindowToTopAsync(windowString: string): Promise<void> {
    const intervalTimer = setInterval(()=> {
      this.run('wmctrl', ['-R', windowString]);
    }, 100);
    setTimeout(()=> {
      clearInterval(intervalTimer);
    }, 5 * 1000);
    return Promise.resolve();
  }

  private run(command: string, args: (any)[]) {
    return new Promise((resolve, reject)=> {
      const options = {
        env: {
          DISPLAY: ':0.0'
        }
      };
      const cp = child_process.spawn(command, args, options);
      cp.on('close', (code)=> {
        if (code === 0) {
          return resolve();
        } else {
          return reject(new Error(`Failed to run command: ${command} ${args} (code: ${code})`));
        }
      });

      cp.on('error', (err)=> {
        return reject(new Error(`Failed to run command: ${command} ${args} ${err}`));
      });

      cp.stdout.on('data', (data) => {
        log.debug(`${data}`);
      });

      cp.stderr.on('data', (data) => {
        log.debug(`grep stderr: ${data}`);
      });
    });
  }
}