import moment from 'moment';

const TIME_FORMAT = 'HH:mm:ss.SS';

export const formatTime = (timeString: string) => {
    if (!timeString) {
        return '';
    }

    return moment(timeString, TIME_FORMAT).format(TIME_FORMAT);
};

export const timeToNumber = (time: string) => {
    if (typeof time === 'number') {
        return time;
    }

    const t = moment(time, TIME_FORMAT);
    const s = moment(time, TIME_FORMAT).startOf('day');
    return t.diff(s);
};

export const numberToTime = (num: number, format = TIME_FORMAT) => {
    if (typeof num === 'string') {
        return formatTime(num);
    }

    const s = moment().startOf('day').valueOf();
    return moment(s + num).format(format);
};
