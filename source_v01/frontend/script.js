$(document).ready(function() {
    // Initialize AdminLTE push menu
    $('[data-widget="pushmenu"]').PushMenu();
  
    // Highlight active sidebar menu item
    function highlightActiveMenu() {
      const currentUrl = window.location.pathname.split('/').pop() || 'index.html';
  
      $('.nav-link').removeClass('active');
      $('.has-treeview').removeClass('menu-open');
  
      $('.nav-link').each(function() {
        const linkUrl = $(this).attr('href');
        if (linkUrl && currentUrl.includes(linkUrl.split('/').pop())) {
          $(this).addClass('active');
          $(this).closest('.has-treeview').addClass('menu-open');
        }
      });
    }
  
    // Format ISO date string to local readable string
    function formatDate(isoString) {
      const date = new Date(isoString);
      return date.toLocaleString();
    }
  
    // Set status text color based on result
    function setStatusColor(elementId, status) {
      const element = $('#' + elementId);
      element.removeClass('text-success text-danger text-warning');
  
      if (status.toLowerCase().includes('success')) {
        element.addClass('text-success');
      } else if (status.toLowerCase().includes('fail')) {
        element.addClass('text-danger');
      } else {
        element.addClass('text-warning');
      }
    }
  
    // Fetch latest file status for roam-in and roam-out
    function fetchAndUpdateStatus() {
      $('#roam-in-last-load, #roam-in-file-name, #roam-in-status').text('Loading...');
      $('#roam-out-last-load, #roam-out-file-name, #roam-out-status').text('Loading...');
  
      $.ajax({
        url: 'http://localhost:3000/api/v1/analytics/status',
        method: 'GET',
        dataType: 'json',
        success: function(response) {
          if (response.data && response.data.length >= 2) {
            const roamInData = response.data.find(item => item.filename.includes('roam_in'));
            if (roamInData) {
              $('#roam-in-last-load').text(formatDate(roamInData.last_load));
              $('#roam-in-file-name').text(roamInData.filename);
              $('#roam-in-status').text(roamInData.status);
              setStatusColor('roam-in-status', roamInData.status);
            }
  
            const roamOutData = response.data.find(item => item.filename.includes('roam_out'));
            if (roamOutData) {
              $('#roam-out-last-load').text(formatDate(roamOutData.last_load));
              $('#roam-out-file-name').text(roamOutData.filename);
              $('#roam-out-status').text(roamOutData.status);
              setStatusColor('roam-out-status', roamOutData.status);
            }
          }
        },
        error: function(xhr, status, error) {
          console.error('Error fetching status:', error);
          $('#roam-in-status, #roam-out-status').text('Error loading data').addClass('text-danger');
        }
      });
    }
  
    // Fetch and update overview cards (roamin, roamout, alerts, notifications)
    function fetchAndUpdateOverview() {
      $('#roam-in-count, #roam-out-count, #alerts-count, #notifications-count').text('...');
  
      $.ajax({
        url: 'http://localhost:3000/api/v1/analytics/overview',
        method: 'GET',
        dataType: 'json',
        success: function(response) {
          if (response.data && response.data.length > 0) {
            const overview = response.data[0];
            $('#roam-in-count').text(overview.roamin.toLocaleString());
            $('#roam-out-count').text(overview.roamout.toLocaleString());
            $('#alerts-count').text(overview.alerts);
            $('#notifications-count').text(overview.notifications);
  
            if (overview.alerts > 0) {
              $('#alerts-count').addClass('text-warning');
            }
            if (overview.notifications > 0) {
              $('#notifications-count').addClass('text-danger');
            }
          }
        },
        error: function(xhr, status, error) {
          console.error('Error fetching overview data:', error);
          $('#roam-in-count, #roam-out-count, #alerts-count, #notifications-count').text('Error');
        }
      });
    }
  
    // Render progress bars for top roam data
    function renderProgressBars(containerId, data, type) {
      const colors = ['bg-primary', 'bg-success', 'bg-warning', 'bg-danger', 'bg-info'];
      const total = data[0].Total;
  
      let html = '';
      data.slice(0, 5).forEach((item, index) => {
        const percentage = Math.round((item.Nombre / total) * 100);
        html += `
          <div class="progress-group">
            ${item.country}
            <span class="float-right"><b>${item.Nombre.toLocaleString()}</b>/${total.toLocaleString()}</span>
            <div class="progress progress-sm">
              <div class="progress-bar ${colors[index % colors.length]}" 
                   style="width: ${percentage}%"
                   role="progressbar" 
                   aria-valuenow="${percentage}" 
                   aria-valuemin="0" 
                   aria-valuemax="100">
              </div>
            </div>
          </div>
        `;
      });
  
      html += `
        <div class="text-right mt-3">
          <small class="text-muted">Updated: ${new Date().toLocaleTimeString()}</small>
        </div>
      `;
  
      $(`#${containerId}`).html(html);
    }
  
    // Fetch and display top roam-in countries
    function fetchAndDisplayRoamIn() {
      $.ajax({
        url: 'http://localhost:3000/api/v1/analytics/top-roamin',
        method: 'GET',
        dataType: 'json',
        success: function(response) {
          if (response.data && response.data.length > 0) {
            renderProgressBars('roamin-progress-bars', response.data, 'roam-in');
          }
        },
        error: function(xhr, status, error) {
          $('#roamin-progress-bars').html(`
            <div class="alert alert-danger">Failed to load roam in data: ${error}</div>
          `);
        }
      });
    }
  
    // Fetch and display top roam-out countries
    function fetchAndDisplayRoamOut() {
      $.ajax({
        url: 'http://localhost:3000/api/v1/analytics/top-roamout',
        method: 'GET',
        dataType: 'json',
        success: function(response) {
          if (response.data && response.data.length > 0) {
            renderProgressBars('roamout-progress-bars', response.data, 'roam-out');
          }
        },
        error: function(xhr, status, error) {
          $('#roamout-progress-bars').html(`
            <div class="alert alert-danger">Failed to load roam out data: ${error}</div>
          `);
        }
      });
    }

    // Initialize Roam-Out Traffic Chart (Line Chart)
    function initializeRoamOutTrafficChart() {
      const ctx = document.getElementById('roamoutTrafficChart')?.getContext('2d');
      if (!ctx) return;
      
      window.roamOutTrafficChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Roam-Out Traffic',
            data: [12000, 19000, 15000, 18000, 16000, 21000],
            backgroundColor: 'rgba(40, 167, 69, 0.2)',
            borderColor: 'rgba(40, 167, 69, 1)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: 'rgba(40, 167, 69, 1)',
            pointRadius: 4,
            pointHoverRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                font: {
                  size: 12,
                  weight: 'bold'
                }
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed.y.toLocaleString()}`;
                },
                title: function(context) {
                  return context[0].label;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: false,
              grid: {
                drawBorder: false
              },
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
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          }
        }
      });
    }

    // Initialize Traffic Distribution Donut Chart
    function initializeTrafficDistributionChart() {
      const ctx = document.getElementById('trafficDistributionChart')?.getContext('2d');
      if (!ctx) return;
      
      window.trafficDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['USA', 'UK', 'Germany', 'France', 'Spain', 'Others'],
          datasets: [{
            data: [35, 20, 15, 10, 8, 12],
            backgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
              '#FF9F40'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: ${value.toLocaleString()} (${percentage}%)`;
                }
              }
            }
          }
        },
        plugins: [{
          afterUpdate: function(chart) {
            const legendContainer = document.getElementById('donutLegend');
            if (legendContainer) {
              legendContainer.innerHTML = chart.generateLegend();
              
              // Add click events to legend
              const legendItems = legendContainer.getElementsByTagName('li');
              for (let i = 0; i < legendItems.length; i++) {
                legendItems[i].addEventListener('click', function() {
                  const meta = chart.getDatasetMeta(0);
                  meta.data[i].hidden = !meta.data[i].hidden;
                  chart.update();
                });
              }
            }
          }
        }]
      });
    }

    // Fetch traffic distribution data from API
    function fetchTrafficDistributionData() {
      $.ajax({
        url: 'http://localhost:3000/api/v1/analytics/traffic-distribution',
        method: 'GET',
        dataType: 'json',
        success: function(response) {
          if (response.data) {
            // Update line chart if it exists
            if (window.roamOutTrafficChart) {
              window.roamOutTrafficChart.data.labels = response.data.months;
              window.roamOutTrafficChart.data.datasets[0].data = response.data.trafficVolumes;
              window.roamOutTrafficChart.update();
            }
            
            // Update donut chart if it exists
            if (window.trafficDistributionChart) {
              window.trafficDistributionChart.data.labels = response.data.countries;
              window.trafficDistributionChart.data.datasets[0].data = response.data.distribution;
              window.trafficDistributionChart.update();
            }
          }
        },
        error: function(xhr, status, error) {
          console.error('Error fetching traffic distribution data:', error);
        }
      });
    }

    // Add click handler for floating refresh button
    $('#refresh-btn').click(function() {
      // Add spin animation
      $(this).find('i').addClass('fa-spin');
      
      // Refresh all data
      fetchAndUpdateStatus();
      fetchAndUpdateOverview();
      fetchAndDisplayRoamIn();
      fetchAndDisplayRoamOut();
      fetchTrafficDistributionData();
      
      // Remove spin after 1 second
      setTimeout(function() {
        $('#refresh-btn i').removeClass('fa-spin');
      }, 1000);
    });
  
    // Initialize dashboard
    highlightActiveMenu();
    fetchAndUpdateStatus();
    fetchAndUpdateOverview();
    fetchAndDisplayRoamIn();
    fetchAndDisplayRoamOut();
    initializeRoamOutTrafficChart();
    initializeTrafficDistributionChart();
    fetchTrafficDistributionData();

    // Auto-refresh every 30 seconds
    setInterval(fetchAndUpdateStatus, 30000);
    setInterval(fetchAndUpdateOverview, 30000);
    setInterval(fetchAndDisplayRoamIn, 30000);
    setInterval(fetchAndDisplayRoamOut, 30000);
    setInterval(fetchTrafficDistributionData, 30000);

    // Handle chart resizing when cards are collapsed/expanded
    $('[data-card-widget="collapse"]').click(function() {
      setTimeout(function() {
        if (window.roamOutTrafficChart) {
          window.roamOutTrafficChart.resize();
        }
        if (window.trafficDistributionChart) {
          window.trafficDistributionChart.resize();
        }
      }, 300);
    });
});