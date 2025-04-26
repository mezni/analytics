$(document).ready(function () {
  const API_BASE = 'http://localhost:3000/api/v1';
  const METRICS_ENDPOINT = '/metrics';

  const charts = {
    historical: null
  };

  function formatNumber(num) {
    return num ? num.toLocaleString() : 'N/A';
  }

  function formatChartDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  function calculatePercentage(count, total) {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  function createProgressBars(containerId, data, total, direction) {
    const $container = $(`#${containerId}`);
    $container.empty();

    if (!data || data.length === 0) {
      $container.html('<div class="alert alert-info">No data available</div>');
      return;
    }

    data.sort((a, b) => b.count - a.count);

    data.forEach(item => {
      const percentage = calculatePercentage(item.count, total);
      const barClass = direction === 'totin' ? 'bg-primary' : 'bg-info';

      $container.append(`
        <div class="mb-4">
          <p class="mb-1">
            ${item.country || 'Unknown'}
            <span class="float-right">${formatNumber(item.count)} (${percentage}%)</span>
          </p>
          <div class="progress progress-xs">
            <div class="progress-bar ${barClass}" 
                 role="progressbar" 
                 style="width: ${percentage}%"
                 aria-valuenow="${percentage}" 
                 aria-valuemin="0" 
                 aria-valuemax="100">
            </div>
          </div>
        </div>
      `);
    });
  }

  // 1. Roam In Total Global
  async function fetchRoamInTotalGlobal() {
    return fetchData(`${API_BASE}${METRICS_ENDPOINT}?direction=totin&dimensions=global`);
  }

  // 2. Roam In Active Global
  async function fetchRoamInActiveGlobal() {
    return fetchData(`${API_BASE}${METRICS_ENDPOINT}?direction=actin&dimensions=global`);
  }

  // 3. Roam Out Global
  async function fetchRoamOutGlobal() {
    return fetchData(`${API_BASE}${METRICS_ENDPOINT}?direction=out&dimensions=global`);
  }

  // 4. Top Roam In by Country
  async function fetchTopRoamInByCountry() {
    return fetchData(`${API_BASE}${METRICS_ENDPOINT}?direction=totin&dimensions=country&limit=5`);
  }

  // 5. Top Roam Out by Country
  async function fetchTopRoamOutByCountry() {
    return fetchData(`${API_BASE}${METRICS_ENDPOINT}?direction=out&dimensions=country&limit=5`);
  }

  // 6. History Roam In Total
  async function fetchHistoryRoamInTotal() {
    return fetchData(`${API_BASE}${METRICS_ENDPOINT}?direction=totin&dimensions=global&kind=history`);
  }

  // 7. History Roam In Active
  async function fetchHistoryRoamInActive() {
    return fetchData(`${API_BASE}${METRICS_ENDPOINT}?direction=actin&dimensions=global&kind=history`);
  }

  // 8. History Roam In by Country
  async function fetchHistoryRoamInByCountry() {
    return fetchData(`${API_BASE}${METRICS_ENDPOINT}?direction=totin&dimensions=country&kind=history`);
  }

  // 9. History Roam In by Operator
  async function fetchHistoryRoamInByOperator() {
    return fetchData(`${API_BASE}${METRICS_ENDPOINT}?direction=totin&dimensions=operator&kind=history`);
  }

  // 10. History Roam Out by Country
  async function fetchHistoryRoamOutByCountry() {
    return fetchData(`${API_BASE}${METRICS_ENDPOINT}?direction=out&dimensions=country&kind=history`);
  }

  // 11. History Roam Out by Operator
  async function fetchHistoryRoamOutByOperator() {
    return fetchData(`${API_BASE}${METRICS_ENDPOINT}?direction=out&dimensions=operator&kind=history`);
  }

  // Generic fetch function
  async function fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch from ${url}`);
    const result = await response.json();
    return result.data || [];
  }

  async function initHistoricalChart() {
    try {
      const [total, active] = await Promise.all([
        fetchHistoryRoamInTotal(),
        fetchHistoryRoamInActive()
      ]);

      const labels = total.map(item => formatChartDate(item.date));
      const totalCounts = total.map(item => item.count);
      const activeCounts = active.map(item => item.count);

      const ctx = document.getElementById('historicalChart').getContext('2d');
      if (charts.historical) charts.historical.destroy();

      charts.historical = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Total Roam In',
              data: totalCounts,
              borderColor: 'rgba(78, 115, 223, 1)',
              backgroundColor: 'rgba(78, 115, 223, 0.1)',
              pointBackgroundColor: '#4e73df',
              fill: true
            },
            {
              label: 'Active Roam In',
              data: activeCounts,
              borderColor: 'rgba(54, 185, 204, 1)',
              backgroundColor: 'rgba(54, 185, 204, 0.1)',
              pointBackgroundColor: '#36b9cc',
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: false,
              ticks: {
                callback: function (value) {
                  return value.toLocaleString();
                }
              }
            },
            x: {
              grid: { display: false }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function (context) {
                  return `${context.dataset.label}: ${context.raw.toLocaleString()}`;
                }
              }
            }
          }
        }
      });
    } catch (err) {
      console.error('Error initializing historical chart:', err);
    }
  }

  async function fetchAndRenderMetric(fetchFn, elementId) {
    try {
      const data = await fetchFn();
      if (data.length > 0) {
        const item = data[0];
        $(`#${elementId}-count`).text(formatNumber(item.count));
        $(`#${elementId}-date`).text(`as of ${formatDate(item.date)}`);
        return item.count;
      } else {
        $(`#${elementId}-count`).text('No data');
        return 0;
      }
    } catch (err) {
      console.error(`Error fetching metric for ${elementId}:`, err);
      $(`#${elementId}-count`).text('Error');
      $(`#${elementId}-date`).text('Data unavailable');
      return 0;
    }
  }

  function renderPieChart(data, chartId, labelKey) {
    const ctx = document.getElementById(chartId).getContext('2d');
    if (!ctx) return;

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(item => item[labelKey] || 'Unknown'),
        datasets: [{
          data: data.map(item => item.count),
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#FF9F40', '#4BC0C0']
        }]
      }
    });
  }

  function aggregateByField(historyData, field) {
    const aggregated = {};
    historyData.forEach(item => {
      const key = item[field] || 'Unknown';
      aggregated[key] = (aggregated[key] || 0) + item.count;
    });

    return Object.entries(aggregated)
      .map(([label, count]) => ({ [field]: label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  async function renderDoughnutCharts() {
    try {
      const [historyByCountry, historyByOperator] = await Promise.all([
        fetchHistoryRoamInByCountry(),
        fetchHistoryRoamInByOperator()
      ]);

      const topCountries = aggregateByField(historyByCountry, 'country');
      const topOperators = aggregateByField(historyByOperator, 'operator');

      renderPieChart(topCountries, 'pieChartRoamIn', 'country');
      renderPieChart(topOperators, 'pieChartRoamOut', 'operator');
    } catch (err) {
      console.error('Error rendering doughnut charts:', err);
    }
  }

  async function loadAllData() {
    try {
      await initHistoricalChart();

      const [roamInTotal, roamOutTotal] = await Promise.all([
        fetchAndRenderMetric(fetchRoamInTotalGlobal, 'roam-in'),
        fetchAndRenderMetric(fetchRoamOutGlobal, 'roam-out')
      ]);

      await renderDoughnutCharts();

      const [roamInCountries, roamOutCountries] = await Promise.all([
        fetchTopRoamInByCountry(),
        fetchTopRoamOutByCountry()
      ]);

      createProgressBars('roam-in-progress-bars', roamInCountries, roamInTotal, 'totin');
      createProgressBars('roam-out-progress-bars', roamOutCountries, roamOutTotal, 'out');
    } catch (err) {
      console.error('Error loading all dashboard data:', err);
    }
  }

  loadAllData();
  setInterval(loadAllData, 300000); // Refresh every 5 minutes
});
