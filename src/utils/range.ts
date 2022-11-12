export function range(length: number) {
    return new Array(length).fill(1).map((_, i) => i + 1);
}
