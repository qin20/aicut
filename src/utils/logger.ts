import pino from 'pino';
import pretty from 'pino-pretty';
import cliProgress from 'cli-progress';

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
}, pretty({
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'hostname,pid',
}));

let bar1: cliProgress.SingleBar;
export function progress(name: string, max: number) {
    const api = {
        start() {
            bar1 = new cliProgress.SingleBar({
                format: `> ${name} [{bar}] {percentage}% | {value}/{total} | 剩余时间：{rest}`,
            }, cliProgress.Presets.legacy);
            bar1.start(max, 0, { rest: 'N/A' });
            return bar1;
        },
        stop() {
            bar1.stop();
            return api;
        },
    };

    return api;
}
