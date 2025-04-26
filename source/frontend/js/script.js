$(document).ready(function() {
  // API configuration
  const API_BASE = 'http://localhost:3000/api/v1';
  const METRICS_ENDPOINT = '/metrics';
  
  // Chart instances
  const charts = {
    historical: null,
    roamIn: null,
    roamOut: null
  };

  // Format number with commas
  function formatNumber(num) {
    return num ? num.toLocaleString() : 'N/A';
  }

  // Format date (short format like "Apr 15")
  function formatChartDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Format date (long format)
  function formatDate(dateString) {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  }

  // Calculate percentage
  function calculatePercentage(count, total) {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  // Create horizontal progress bars
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

  // Initialize historical chart
  async function initHistoricalChart() {
    try {
      // Fetch both total and active data in parallel
      const [totalResponse, activeResponse] = await Promise.all([
        fetch(`${API_BASE}${METRICS_ENDPOINT}?direction=totin&dimensions=global&kind=history`),
        fetch(`${API_BASE}${METRICS_ENDPOINT}?direction=actin&dimensions=global&kind=history`)
      ]);

      if (!totalResponse.ok || !activeResponse.ok) {
        throw new Error('Failed to fetch historical data');
      }

      const totalData = await totalResponse.json();
      const activeData = await activeResponse.json();

      const dates = totalData.data.map(item => formatChartDate(item.date));
      const totalCounts = totalData.data.map(item => item.count);
      const activeCounts = activeData.data.map(item => item.count);

      const ctx = document.getElementById('historicalChart').getContext('2d');
      
      // Destroy previous chart if exists
      if (charts.historical) {
        charts.historical.destroy();
      }

      charts.historical = new Chart(ctx, {
        type: 'line',
        data: {
          labels: dates,
          datasets: [
            {
              label: 'Total Roam In',
              data: totalCounts,
              backgroundColor: 'rgba(78, 115, 223, 0.1)',
              borderColor: 'rgba(78, 115, 223, 1)',
              borderWidth: 2,
              pointBackgroundColor: '#4e73df',
              pointBorderColor: '#fff',
              pointRadius: 4,
              pointHoverRadius: 6,
              fill: true
            },
            {
              label: 'Active Roam In',
              data: activeCounts,
              backgroundColor: 'rgba(54, 185, 204, 0.1)',
              borderColor: 'rgba(54, 185, 204, 1)',
              borderWidth: 2,
              pointBackgroundColor: '#36b9cc',
              pointBorderColor: '#fff',
              pointRadius: 4,
              pointHoverRadius: 6,
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
                callback: function(value) {
                  return value.toLocaleString();
                }
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.raw.toLocaleString()}`;
                }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error initializing historical chart:', error);
      $('#historicalChart').closest('.card-body').html(
        '<div class="alert alert-danger">Failed to load historical data</div>'
      );
    }
  }

  // Fetch metrics data
  async function fetchMetrics(direction, elementId) {
    try {
      const response = await fetch(`${API_BASE}${METRICS_ENDPOINT}?direction=${direction}&dimensions=global`);
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      
      if (data.data?.length > 0) {
        const metric = data.data[0];
        $(`#${elementId}-count`).text(formatNumber(metric.count));
        $(`#${elementId}-date`).text(`as of ${formatDate(metric.date)}`);
        return metric.count;
      } else {
        $(`#${elementId}-count`).text('No data');
        return 0;
      }
    } catch (error) {
      console.error(`Error fetching ${direction} data:`, error);
      $(`#${elementId}-count`).text('Error');
      $(`#${elementId}-date`).text('Data unavailable');
      return 0;
    }
  }

  // Fetch country data
  async function fetchCountryData(direction) {
    try {
      const response = await fetch(`${API_BASE}${METRICS_ENDPOINT}?direction=${direction}&dimensions=country&limit=5`);
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error(`Error fetching ${direction} country data:`, error);
      return [];
    }
  }

  // Render Pie Chart
  async function renderPieChart(data, chartId) {
    const ctx = document.getElementById(chartId).getContext('2d');
    if (!ctx) {
      console.error(`Chart container with ID ${chartId} not found!`);
      return;
    }

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(item => item.country),
        datasets: [{
          data: data.map(item => item.count),
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#FF9F40', '#4BC0C0'],
        }]
      }
    });
  }

  // Load pie chart data
  async function loadPieCharts() {
    try {
      const roamInData = await fetchCountryData('totin');
      if (roamInData && roamInData.length > 0) {
        renderPieChart(roamInData, 'pieChartRoamIn');
      } else {
        console.error('No data found for Roam In Pie Chart');
      }

      const roamOutData = await fetchCountryData('out');
      if (roamOutData && roamOutData.length > 0) {
        renderPieChart(roamOutData, 'pieChartRoamOut');
      } else {
        console.error('No data found for Roam Out Pie Chart');
      }
    } catch (error) {
      console.error('Error loading pie chart data:', error);
    }
  }

  // Load all metrics and charts
  async function loadAllData() {
    try {
      // Load historical chart
      await initHistoricalChart();

      // Load metrics and progress bars
      const [roamInTotal, roamOutTotal] = await Promise.all([
        fetchMetrics('totin', 'roam-in'),
        fetchMetrics('out', 'roam-out')
      ]);
      
      // Load pie charts for traffic by country
      await loadPieCharts();

      const [roamInCountries, roamOutCountries] = await Promise.all([
        fetchCountryData('totin'),
        fetchCountryData('out')
      ]);
      
      createProgressBars('roam-in-progress-bars', roamInCountries, roamInTotal, 'totin');
      createProgressBars('roam-out-progress-bars', roamOutCountries, roamOutTotal, 'out');
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  // Initial load
  loadAllData();

  // Refresh every 5 minutes
  setInterval(loadAllData, 300000);
});
