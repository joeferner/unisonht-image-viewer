import {Device, UnisonHTResponse} from "unisonht";
import * as express from "express";
import * as HttpStatusCodes from "http-status-codes";
import * as path from "path";
import * as child_process from "child_process";

export class ImageViewer extends Device {
  private lastXMouseMove: number;

  constructor(deviceName: string, options: ImageViewer.Options) {
    super(deviceName, options);
    this.lastXMouseMove = 0;
  }

  getStatus(): Promise<Device.Status> {
    return Promise.resolve({});
  }

  protected handleButtonPress(req: express.Request, res: UnisonHTResponse, next: express.NextFunction): void {
    const buttonName = req.query.button;
    const image = this.findImageFromButton(buttonName);
    if (image) {
      res.promiseNoContent(this.displayImage(image));
      return;
    }
    res.status(HttpStatusCodes.BAD_REQUEST).send(`Invalid button: ${buttonName}`);
  }

  private findImageFromButton(button: string) {
    return this.getOptions().images[button];
  }

  private displayImage(image: string): Promise<void> {
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

  public getOptions(): ImageViewer.Options {
    return <ImageViewer.Options>super.getOptions();
  }
}

export module ImageViewer {
  export interface Options extends Device.Options {
    images: {
      [key: string]: string;
    }
  }
}