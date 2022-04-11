export default class Histogramer {
  private width: number;
  private count: number = 0;
  private minValue: number = 0;
  private maxValue: number = 0;
  private collection: Record<number, number> = {};

  constructor(width: number = 50) {
    this.width = width;
    this.minValue = Number.POSITIVE_INFINITY;
    this.maxValue = Number.NEGATIVE_INFINITY;
  }

  public add(value: number) {
    ++this.count;
    this.minValue = Math.min(this.minValue, value);
    this.maxValue = Math.max(this.maxValue, value);

    const idx = Math.floor(value / this.width);
    if (!(idx in this.collection)) this.collection[idx] = 0;
    this.collection[idx]++;
  }

  public report() {
    let reportText: string = '';

    reportText += 'count: ' + this.count.toString() + '\n';
    reportText += 'min: ' + this.minValue.toString() + '\n';
    reportText += 'max: ' + this.maxValue.toString() + '\n';

    Object.keys(this.collection)
      .map(v => Number(v))
      .sort((a, b) => (a === b ? 0 : a > b ? 1 : -1))
      .forEach(idx => {
        const r =
          '[' +
          (idx * this.width).toString() +
          '; ' +
          ((idx + 1) * this.width).toString() +
          ']: ' +
          this.collection[idx] +
          ' (' +
          ((this.collection[idx] / this.count) * 100).toFixed(2) +
          '%)' +
          '\n';
        reportText += r;
      });

    return reportText;
  }
}
