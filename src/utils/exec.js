/**
 * 执行命令
 */
import { spawn } from 'child_process';
import util from 'util';
import duration from 'duration';
import { logger } from './logger';

const root = process.cwd();
let execId = 1;

function formatCommand(command) {
    const [cmd, ...args] = command.trim().split(/\s\s*/);
    return [cmd, args];
}

export function exec(command, options = {}) {
    return new Promise((resolve, reject) => {
        const [cmd, args] = formatCommand(command);
        const descr = `exec:${execId++} "${options.description || ''}"`;
        const start = new Date();

        logger.info(`${descr} ${command}`);

        const cp = spawn(cmd, args, {
            cwd: root,
            stdio: 'inherit',
            shell: true,
            ...options,
        });

        cp.on('error', (error) => {
            logger.error(`${descr} ${command}失败: ${util.inspect(error.stack)}`);
            reject(new Error(`${descr} ${command}失败`));
        });

        cp.on('exit', (exitCode) => {
            if (exitCode) {
                const error = `${descr}失败: failed with exit code ${exitCode}`;
                logger.error(error);
                reject(new Error(`${descr}失败`));
            } else {
                logger.debug(`${descr}成功，耗时${duration(start, new Date())}`);
                resolve();
            }
        });
    });
}

export function execGetOutput(command, description = 'exec') {
    return new Promise((resolve, reject) => {
        const [cmd, args] = formatCommand(command);
        const descr = `exec:${execId++} "${description}"`;
        const start = new Date();

        logger.debug(`${descr} ${command}`);

        const cp = spawn(cmd, args, {
            cwd: root,
            // stdio: [process.stdin, 'pipe', process.stderr],
            shell: true,
        });

        cp.stdout.setEncoding('utf8');
        cp.stderr.setEncoding('utf8');

        const buffers = [];
        cp.stdout.on('data', (data) => {
            buffers.push(data);
        });

        cp.stderr.on('data', (data) => {
            buffers.push(data);
        });

        cp.on('error', (e) => {
            const error = `${descr}失败 : ${util.inspect(e.stack)}`;
            logger.error(error);
            reject(new Error(`${descr}失败`));
        });

        cp.on('exit', (exitCode) => {
            if (exitCode) {
                const error = `${descr}失败 : failed with exit code ${exitCode}`;
                logger.error(error);
                reject(Buffer.concat(buffers).toString('utf-8').trim());
            } else {
                logger.debug(`${descr}成功，耗时${duration(start, new Date())}`);
                resolve(buffers.join('\n').toString('utf-8').trim());
                // resolve(Buffer.concat(buffers).toString('utf-8').trim());
            }
        });
    });
}
