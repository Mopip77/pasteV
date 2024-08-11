import { PNG } from 'pngjs';

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