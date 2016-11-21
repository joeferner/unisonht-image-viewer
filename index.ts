import {UnisonHTDevice} from "unisonht";
import * as path from "path";
import * as child_process from "child_process";
import createLogger from "unisonht/lib/Log";
const log = createLogger('image-viewer');

export default class ImageViewer implements UnisonHTDevice {
  private options: ImageViewer.Options;
  private lastXMouseMove: number;

  constructor(options: ImageViewer.Options) {
    this.lastXMouseMove = 0;
    this.options = options;
  }

  getName(): string {
    return this.options.name;
  }

  ensureOn(): Promise<void> {
    return Promise.resolve();
  }

  ensureOff(): Promise<void> {
    return Promise.resolve();
  }

  buttonPress(button: string): Promise<void> {
    const image = this.findImageFromButton(button);
    if (image) {
      return this.displayImage(image);
    }
    return Promise.reject(new Error('Invalid button: ' + button));
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
    const intervalTimer = setInterval(()=> {
      this.run('wmctrl', ['-R', windowString], true);
    }, 100);
    setTimeout(()=> {
      clearInterval(intervalTimer);
    }, 5 * 1000);
    return Promise.resolve();
  }

  private run(command: string, args: (any)[], waitForExit: boolean) {
    return new Promise((resolve, reject)=> {
      const options = {
        env: {
          DISPLAY: ':0.0'
        }
      };
      log.debug(`running ${command} ${args}`);
      const cp = child_process.spawn(command, args, options);
      cp.on('error', (err)=> {
        return reject(new Error(`Failed to run command: ${command} ${args} ${err}`));
      });

      cp.stdout.on('data', (data) => {
        log.debug(`${data}`);
      });

      cp.stderr.on('data', (data) => {
        log.debug(`grep stderr: ${data}`);
      });

      if (waitForExit) {
        cp.on('exit', (code)=> {
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

module ImageViewer {
  export interface Options {
    name: string;
    images: {
      [key: string]: string;
    }
  }
}