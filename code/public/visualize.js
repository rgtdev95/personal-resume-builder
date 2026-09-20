'use strict';

const Visualize = (() => {
  let chart = null;

  async function render() {
    const data = await fetchJson('/api/applications/funnel');
    const container = document.getElementById('funnel-chart');
    const empty = document.getElementById('funnel-empty');

    if (data.nodes.length === 0) {
      empty.hidden = false;
      container.hidden = true;
      return;
    }
    empty.hidden = true;
    container.hidden = false;

    if (!chart) chart = echarts.init(container);
    chart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: (params) =>
          params.dataType === 'edge' ? `${params.data.source} &rarr; ${params.data.target}: ${params.data.value}` : `${params.name}`,
      },
      series: [
        {
          type: 'sankey',
          data: data.nodes,
          links: data.links,
          emphasis: { focus: 'adjacency' },
          lineStyle: { color: 'gradient', curveness: 0.5 },
          label: { color: '#222' },
        },
      ],
    });
    chart.resize();
  }

  window.addEventListener('resize', () => {
    if (chart) chart.resize();
  });

  return { render };
})();
