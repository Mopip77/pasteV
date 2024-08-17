import { PNG } from 'pngjs';
import sharp from 'sharp';

export function readPngMetadata(buffer: Buffer): Promise<PNG> {
    return new Promise((resolve, reject) => {
        const png = new PNG();
        png.parse(buffer, (error, data) => {
            if (error) {
                reject(error);
            } else {
                resolve(data);
            }
        });
    });
}

interface PictureConfig {
    content: Buffer;
    originWidth: number;
    originHeight: number;
    quality?: number,
    maxWidth?: number;
    maxHeight?: number;
}

export const compressionPicture = async (config: PictureConfig): Promise<Buffer> => {
    let defaultConfig = {
        type: 'image/jpeg',
        quality: 0.5,
        maxWidth: 600,
        maxHeight: 600,
    }
    defaultConfig = Object.assign(defaultConfig, config);

    // 等比例进行宽高缩放
    let targetWidth = config.originWidth;
    let targetHeight = config.originHeight;
    if (config.originWidth > defaultConfig.maxWidth || config.originHeight > defaultConfig.maxHeight) {
        if (config.originWidth / config.originHeight > defaultConfig.maxWidth / defaultConfig.maxHeight) {
            targetWidth = defaultConfig.maxWidth;
            targetHeight = Math.round(defaultConfig.maxWidth * (config.originHeight / config.originWidth));
        } else {
            targetHeight = defaultConfig.maxHeight;
            targetWidth = Math.round(defaultConfig.maxHeight * (config.originWidth / config.originHeight));
        }
    }

    return sharp(config.content)
        .resize(targetWidth, targetHeight)
        .toBuffer()
}