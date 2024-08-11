import { exec } from 'child_process';
import { app } from 'electron';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const baseDir = process.env.NODE_ENV === 'development' ? process.cwd() : process.resourcesPath;
const ocrScript = `${baseDir}/build/ocr.scpt`;

export function ocr(imageBuffer: Buffer): Promise<string> {
    const tempFilePath = app.getPath('temp') + `/${uuidv4()}.png`;
    fs.writeFileSync(tempFilePath, imageBuffer);

    return new Promise((resolve, reject) => {
        exec(`osascript ${ocrScript} ${tempFilePath}`, (error, stdout, stderr) => {
            fs.unlinkSync(tempFilePath); // Remove the temporary file

            if (error) {
                reject(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                reject(`Stderr: ${stderr}`);
                return;
            }
            resolve(stdout.trim());
        });
    });
}