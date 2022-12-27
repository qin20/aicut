export const effects = [
    'fade',
    'wipeleft',
    'wiperight',
    'wipeup',
    'wipedown',
    // 'slideleft',
    // 'slideright',
    // 'slideup',
    // 'slidedown',
    // 'circlecrop',
    // 'rectcrop',
    'distance',
    // 'fadeblack',
    // 'fadewhite',
    // 'radial',
    'smoothleft',
    'smoothright',
    'smoothup',
    'smoothdown',
    'circleopen',
    'circleclose',
    'vertopen',
    'vertclose',
    'horzopen',
    'horzclose',
    'dissolve',
    'pixelize',
    'diagtl',
    'diagtr',
    'diagbl',
    'diagbr',
    // 'hlslice',
    // 'hrslice',
    // 'vuslice',
    // 'vdslice',
    'hblur',
    'fadegrays',
    // 'wipetl',
    // 'wipetr',
    // 'wipebl',
    // 'wipebr',
    // 'squeezeh',
    // 'squeezev',
    'zoomin',
    'fadefast',
    'fadeslow',
];

export function random() {
    return effects[Math.floor(Math.random() * effects.length)];
}
