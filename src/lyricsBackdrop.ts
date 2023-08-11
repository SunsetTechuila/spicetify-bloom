import { FastAverageColor, FastAverageColorResult } from "fast-average-color";
import { gsap } from "gsap";
import {waitForElements} from "./utils"

export default class lyricsBackdrop {
public static blurValue:number;

public static saturation:number;

public static brightness:number;

protected static _fac = new FastAverageColor();

protected static _previousAlbumUri:string;

private static getColorSaturation(color:FastAverageColorResult):number {
  // remove alpha channel
  const value = color.value.slice(0, 3);
  const max = Math.max(...value);
  const min = Math.min(...value);
  const delta = max - min;
  return max !== 0 ? delta / max : 0;
}

private static getImageSaturation(image):number {

}

private static async calculateSaturationCoefficient(originalImage, canvasImage):number {
  const [averageOriginalColor, averageCanvasColor] = await Promise.all([
    lyricsBackdrop._fac.getColorAsync(originalImage, {
      ignoredColor: [0, 0, 0, 255, 10],
    }),
    lyricsBackdrop._fac.getColorAsync(canvasImage),
    { ignoredColor: [0, 0, 0, 255, 10] },
  ])

  const [averageOriginalSaturation, averageCanvasSaturation] = [
    lyricsBackdrop.getColorSaturation(averageOriginalColor),
    lyricsBackdrop.getColorSaturation(averageCanvasColor),
  ];

  let saturationCoefficient;

  if (averageCanvasSaturation < averageOriginalSaturation) {
    saturationCoefficient = averageOriginalSaturation / averageCanvasSaturation;
  } else {
    saturationCoefficient = 1;
  }

  const finalSaturation = (averageCanvasSaturation * saturationCoefficient).toFixed(1);

  if (finalSaturation > 0.8) {
    saturationCoefficient = 1 - (finalSaturation - 0.8);
  }

  if (finalSaturation < 0.5 && averageOriginalSaturation > 0.05) {
    saturationCoefficient += 0.5 - finalSaturation;
  }

  if (saturationCoefficient > 1.7) {
    saturationCoefficient = 1.7;
  }

  return saturationCoefficient.toFixed(1);
}


  async  calculateBrightnessCoefficient(image) {
    // ignore colors darker than 50% by HSB, because 0.5 is the brightness threshold
    const averageColor = await fac.getColorAsync(image, {
      ignoredColor: [0, 0, 0, 255, 125],
    });

    // slice(0, 3) - remove alpha channel value
    let brightness = Math.max(...averageColor.value.slice(0, 3));
    brightness = (brightness / 255).toFixed(1);

    return brightness > 0.5 ? 1 - (brightness - 0.5) : 1;
  }

async updateLyricsBackdrop() {


  }

  // necessary because backdrop edges become transparent due to blurring
  async calculateContextDrawValues(canvas) {
    const drawWidth = canvas.width + blur * 2;
    const drawHeight = canvas.height + blur * 2;
    const drawX = 0 - blur;
    const drawY = 0 - blur;
    return [drawWidth, drawHeight, drawX, drawY];
  }

  async getImageFromCanvas(canvas) {
    const image = new Image();
    image.src = canvas.toDataURL();
    return image;
  }

  async updateFilters(canvas, image) {
      const canvasImage = await getImageFromCanvas(canvas);
      const [brightnessCoefficient, saturationCoefficient] = await Promise.all([
        calculateBrightnessCoefficient(canvasImage),
        calculateSaturationCoefficient(image, canvasImage),
      ]);
      // eslint-disable-next-line no-param-reassign
      canvas.style.filter = `saturate(${saturationCoefficient}) brightness(${brightnessCoefficient})`;

  }

  waitForElements(['#lyrics-backdrop'], () => {
    if (previousAlbumUri === Spicetify.Player.data.track.metadata.album_uri) {
      updateLyricsPageProperties();
      return;
    }
    previousAlbumUri = Spicetify.Player.data.track.metadata.album_uri;

    const lyricsBackdropPrevious = document.getElementById('lyrics-backdrop');
    const contextPrevious = lyricsBackdropPrevious.getContext('2d');
    contextPrevious.globalCompositeOperation = 'destination-out';
    contextPrevious.filter = `blur(${blur}px)`;

    const lyricsBackdrop = document.createElement('canvas');
    lyricsBackdrop.id = 'lyrics-backdrop';
    fillCanvas(lyricsBackdrop);
    lyricsBackdropPrevious.insertAdjacentElement('beforebegin', lyricsBackdrop);
    const context = lyricsBackdrop.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.filter = `blur(${blur}px)`;

    const lyricsBackdropImage = new Image();
    lyricsBackdropImage.src = Spicetify.Player.data.track.metadata.image_xlarge_url;

    lyricsBackdropImage.onload = async () => {
      const [drawWidth, drawHeight, drawX, drawY] = await calculateContextDrawValues(
        lyricsBackdrop
      );
      context.drawImage(lyricsBackdropImage, drawX, drawY, drawWidth, drawHeight);
      updateFilters(lyricsBackdrop, lyricsBackdropImage);

      const maxRadius = Math.ceil(
        Math.sqrt(lyricsBackdropPrevious.width ** 2 + lyricsBackdropPrevious.height ** 2) / 2
      );
      const centerX = lyricsBackdropPrevious.width / 2;
      const centerY = lyricsBackdropPrevious.height / 2;
      const radius = { value: 0 };


        gsap.to(radius, {
          duration: 0.8,
          value: maxRadius,
          onUpdate: () => {
            contextPrevious.beginPath();
            contextPrevious.arc(centerX, centerY, radius.value, 0, Math.PI * 2);
            contextPrevious.closePath();
            contextPrevious.fill();
          },
          onComplete: () => {
            updateLyricsPageProperties();
            lyricsBackdropPrevious.remove();
          },
          ease: 'sine.out',
        });

    };
  });
}

 initLyricsBackdrop() {
  waitForElements(['.under-main-view'], () => {
    const underMainView = document.querySelector('.under-main-view');
    const lyricsBackdropContainer = document.createElement('div');
    lyricsBackdropContainer.id = 'lyrics-backdrop-container';
    underMainView.prepend(lyricsBackdropContainer);

    const lyricsBackdrop = document.createElement('canvas');
    lyricsBackdrop.id = 'lyrics-backdrop';
    lyricsBackdropContainer.appendChild(lyricsBackdrop);

    fillCanvas(lyricsBackdrop);
    updateLyricsBackdrop();
  });
}

 fillCanvas(canvas) {
    const context = canvas.getContext('2d');
    const rootStyles = getComputedStyle(document.documentElement);
    const spiceRgbMain = rootStyles.getPropertyValue('--spice-rgb-main').split(',');
    context.fillStyle = `rgb(
      ${spiceRgbMain[0].trim()},
      ${spiceRgbMain[1]},
      ${spiceRgbMain[2]}
      )`;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
}
