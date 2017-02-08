import {Device, UnisonHTResponse, UnisonHT} from "unisonht";
import * as express from "express";
import * as HttpStatusCodes from "http-status-codes";
import {MockImageViewerService} from "./MockImageViewerService";
import {ImageViewerServiceImpl} from "./ImageViewerServiceImpl";
import {ImageViewerService} from "./ImageViewerService";

export class ImageViewer extends Device {
  private service: ImageViewerService;

  constructor(deviceName: string, options: ImageViewer.Options) {
    super(deviceName, options);
    this.service = process.env.NODE_ENV === 'development'
      ? new MockImageViewerService()
      : new ImageViewerServiceImpl();
  }

  start(unisonht: UnisonHT): Promise<void> {
    return super.start(unisonht)
      .then(() => {
        unisonht.getApp().post(`${this.getPathPrefix()}/off`, this.handleOff.bind(this));
      })
  }

  private handleOff(req: express.Request, res: UnisonHTResponse, next: express.NextFunction): void {
    res.promiseNoContent(this.service.off());
  }

  getStatus(): Promise<Device.Status> {
    return Promise.resolve({});
  }

  protected handleButtonPress(req: express.Request, res: UnisonHTResponse, next: express.NextFunction): void {
    const buttonName = req.query.button;
    const image = this.findImageFromButton(buttonName);
    if (image) {
      res.promiseNoContent(this.service.displayImage(image));
      return;
    }
    res.status(HttpStatusCodes.BAD_REQUEST).send(`Invalid button: ${buttonName}`);
  }

  private findImageFromButton(button: string) {
    return this.getOptions().images[button];
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