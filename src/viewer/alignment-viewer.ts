import * as d3 from 'd3';
import type { XmfaAlignment, Lcb } from '../xmfa/types.ts';

export interface ViewerConfig {
  readonly width: number;
  readonly panelHeight: number;
  readonly panelGap: number;
  readonly margin: {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
  };
}

const DEFAULT_CONFIG: ViewerConfig = {
  width: 960,
  panelHeight: 120,
  panelGap: 40,
  margin: { top: 20, right: 20, bottom: 20, left: 120 },
};

function assignLcbColors(lcbs: readonly Lcb[]): readonly string[] {
  return lcbs.map((_, i) => {
    const hue = (i * 60 + (i % 6) * 30) % 360;
    return d3.hsl(hue, 0.7, 0.5).formatHex();
  });
}

export function renderAlignment(
  container: HTMLElement,
  alignment: XmfaAlignment,
  config: ViewerConfig = DEFAULT_CONFIG,
): SVGSVGElement {
  const { genomes, lcbs } = alignment;
  const { width, panelHeight, panelGap, margin } = config;
  const innerWidth = width - margin.left - margin.right;
  const totalHeight =
    margin.top +
    genomes.length * panelHeight +
    (genomes.length - 1) * panelGap +
    margin.bottom;

  const colors = assignLcbColors(lcbs);

  d3.select(container).select('svg').remove();

  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', totalHeight)
    .attr('viewBox', `0 0 ${width} ${totalHeight}`);

  const root = svg
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  for (let gi = 0; gi < genomes.length; gi++) {
    const genome = genomes[gi]!;
    const panelY = gi * (panelHeight + panelGap);
    renderGenomePanel(root, genome, panelY, gi, lcbs, colors, panelHeight, innerWidth);
  }

  renderConnectingLines(root, genomes, lcbs, colors, config);

  return svg.node()!;
}

function renderGenomePanel(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  genome: { readonly name: string; readonly length: number },
  panelY: number,
  genomeIndex: number,
  lcbs: readonly Lcb[],
  colors: readonly string[],
  panelHeight: number,
  innerWidth: number,
): void {
  const xScale = d3
    .scaleLinear()
    .domain([1, genome.length])
    .range([0, innerWidth]);

  const panel = root
    .append('g')
    .attr('class', 'genome-panel')
    .attr('transform', `translate(0,${panelY})`);

  panel
    .append('text')
    .attr('x', -10)
    .attr('y', panelHeight / 2)
    .attr('text-anchor', 'end')
    .attr('dominant-baseline', 'middle')
    .attr('class', 'genome-label')
    .text(genome.name);

  panel
    .append('rect')
    .attr('class', 'genome-background')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', innerWidth)
    .attr('height', panelHeight)
    .attr('fill', '#f8f8f8')
    .attr('stroke', '#ccc');

  const centerY = panelHeight / 2;
  panel
    .append('line')
    .attr('class', 'center-line')
    .attr('x1', 0)
    .attr('x2', innerWidth)
    .attr('y1', centerY)
    .attr('y2', centerY)
    .attr('stroke', '#999')
    .attr('stroke-width', 1);

  renderRuler(panel, xScale, panelHeight, innerWidth);
  renderLcbBlocks(panel, genomeIndex, lcbs, colors, xScale, panelHeight, centerY);
}

function renderLcbBlocks(
  panel: d3.Selection<SVGGElement, unknown, null, undefined>,
  genomeIndex: number,
  lcbs: readonly Lcb[],
  colors: readonly string[],
  xScale: d3.ScaleLinear<number, number>,
  panelHeight: number,
  centerY: number,
): void {
  for (let li = 0; li < lcbs.length; li++) {
    const lcb = lcbs[li]!;
    const left = lcb.left[genomeIndex];
    const right = lcb.right[genomeIndex];
    if (left === undefined || right === undefined || left === 0) continue;

    const isReverse = lcb.reverse[genomeIndex] ?? false;
    const x = xScale(left);
    const blockWidth = xScale(right) - xScale(left);
    const blockHeight = panelHeight / 2 - 4;
    const y = isReverse ? centerY + 2 : centerY - blockHeight - 2;

    panel
      .append('rect')
      .attr('class', 'lcb-block')
      .attr('x', x)
      .attr('y', y)
      .attr('width', Math.max(blockWidth, 2))
      .attr('height', blockHeight)
      .attr('fill', colors[li]!)
      .attr('fill-opacity', 0.6)
      .attr('stroke', colors[li]!)
      .attr('stroke-width', 1);
  }
}

function renderRuler(
  panel: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: d3.ScaleLinear<number, number>,
  panelHeight: number,
  innerWidth: number,
): void {
  const tickCount = Math.min(10, Math.floor(innerWidth / 80));
  const axis = d3.axisBottom(xScale).ticks(tickCount).tickFormat(d3.format('~s'));

  panel
    .append('g')
    .attr('class', 'ruler')
    .attr('transform', `translate(0,${panelHeight})`)
    .call(axis);
}

function renderConnectingLines(
  root: d3.Selection<SVGGElement, unknown, null, undefined>,
  genomes: readonly { readonly length: number }[],
  lcbs: readonly Lcb[],
  colors: readonly string[],
  config: ViewerConfig,
): void {
  const { panelHeight, panelGap, margin } = config;
  const innerWidth = config.width - margin.left - margin.right;

  for (let gi = 0; gi < genomes.length - 1; gi++) {
    const topGenome = genomes[gi]!;
    const bottomGenome = genomes[gi + 1]!;
    const topY = gi * (panelHeight + panelGap) + panelHeight;
    const bottomY = (gi + 1) * (panelHeight + panelGap);

    const topScale = d3
      .scaleLinear()
      .domain([1, topGenome.length])
      .range([0, innerWidth]);
    const bottomScale = d3
      .scaleLinear()
      .domain([1, bottomGenome.length])
      .range([0, innerWidth]);

    for (let li = 0; li < lcbs.length; li++) {
      const lcb = lcbs[li]!;
      const topLeft = lcb.left[gi];
      const topRight = lcb.right[gi];
      const bottomLeft = lcb.left[gi + 1];
      const bottomRight = lcb.right[gi + 1];

      if (
        !topLeft || !topRight || !bottomLeft || !bottomRight
      ) {
        continue;
      }

      const tl = topScale(topLeft);
      const tr = topScale(topRight);
      const bl = bottomScale(bottomLeft);
      const br = bottomScale(bottomRight);

      const path = `M${tl},${topY} L${bl},${bottomY} L${br},${bottomY} L${tr},${topY} Z`;

      root
        .append('path')
        .attr('class', 'lcb-connector')
        .attr('d', path)
        .attr('fill', colors[li]!)
        .attr('fill-opacity', 0.2)
        .attr('stroke', colors[li]!)
        .attr('stroke-width', 0.5);
    }
  }
}
