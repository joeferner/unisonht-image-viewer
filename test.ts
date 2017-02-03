import {UnisonHT} from "unisonht";
import {ImageViewer} from ".";

const unisonht = new UnisonHT();

unisonht.use(new ImageViewer('image-viewer', {
  images: {
    'menu': 'test.jpg'
  }
}));

unisonht.listen(3000);
