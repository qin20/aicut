import fluentFfmpeg from 'fluent-ffmpeg';
import type Ffmpeg from 'fluent-ffmpeg';
import { logger } from './logger';

export { fluentFfmpeg };

export function ffmpegPromise(cmd: Ffmpeg.FfmpegCommand) {
    return new Promise<void>((resolve, reject) => {
        cmd
            .on('start', (commandLine: string) => {
                logger.info('exec: ' + commandLine);
            })
            .on('error', (err: Error) => {
                logger.info('Cannot process video: ' + err.message);
                reject();
            })
            .on('end', () => {
                resolve();
            })
            .run();
    });
}
