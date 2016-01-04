//TODO: change between year, month, day

$(document).ready(function() {

  var firebase = new Firebase("https://stocktrackerkm.firebaseio.com/symbols");
  var context = document.getElementById('stockChart').getContext('2d');
  var stockChart;
  var chartDataSets = [];
  var chartLabels = [];
  var notFound = [];

  for (i = 7; i > 0; i--) {
    chartLabels.push(moment().subtract(i, 'days').format("D-MMM-YY"));
  }

  firebase.on('child_added', function(childSnapshot, prevChildKey) {
    $("#buttonsTracked").append('<button id="btn_' + childSnapshot.key() + '" name="' + childSnapshot.key() + '" type="button" class="btn btn-primary btnRemoveStock">' + childSnapshot.val() + ' <i class="fa fa-times-circle"></i></button> ');

    var options = {
      symbol: childSnapshot.val(),
      datesToFill: chartLabels
    };

    var chartColors = randChartColors();
    var dataObject = {};
    dataObject.labels = chartLabels;
    dataObject.datasets = [];

    $("#btn_" + childSnapshot.key()).css({
      "background-color": chartColors.fillColor
    });
    $("#btn_" + childSnapshot.key()).css({
      "border-color": chartColors.strokeColor
    });
    $("#btn_" + childSnapshot.key()).css({
      "color": "#000"
    });

    getStockDataset(options, function(error, data) {
      if (error) {
        $("#btn_" + childSnapshot.key()).css({
          opacity: 0.25
        });

        notFound.push(childSnapshot.val());
        updateNotFound();

      } else {
        var ypoints = [];
        for (i = 1; i < data.length; i++) {
          ypoints.push(data[i]);
        }

        chartDataSets.push({
          label: data[0],
          fillColor: chartColors.fillColor,
          strokeColor: chartColors.strokeColor,
          pointColor: chartColors.pointColor,
          pointStrokeColor: "#fff",
          pointHighlightFill: "#fff",
          pointHighlightStroke: chartColors.pointHighlightStroke,
          data: ypoints
        });
        generateChart(chartDataSets);
      }
    });
  });

  firebase.on('child_removed', function(oldChildSnapshot) {
    var delBtn = "#btn_" + oldChildSnapshot.key();
    var cleanDataSets = [];
    var foundDataSetMatch = false; //if the user has added the same stock more then once, we should still only remove one dataset
    for (i = 0; i < chartDataSets.length; i++) {
      if (chartDataSets[i].label !== oldChildSnapshot.val() || foundDataSetMatch === true) {
        cleanDataSets.push(chartDataSets[i]);
      } else {
        foundDataSetMatch = true;
      }
    }
    if (foundDataSetMatch === true) {
      chartDataSets = cleanDataSets;
      generateChart(chartDataSets);
    }

    var cleanNotFound = [];
    var foundNotFoundMatch = false;
    for (j = 0; j < notFound.length; j++) {
      if (notFound[j] !== oldChildSnapshot.val() || foundNotFoundMatch === true) {
        cleanNotFound.push(notFound[j]);
      } else {
        foundNotFoundMatch = true;
      }
    }
    if (foundNotFoundMatch === true) {
      notFound = cleanNotFound;
      updateNotFound();
    }
    $(delBtn).remove();

  });

  $("#btnAddStock").click(function() {
    if ($("#txtAddStock").val() !== "") {
      firebase.push($("#txtAddStock").val().toUpperCase());
      $("#txtAddStock").val("");

      chartLabels = [];
      for (i = 7; i > 0; i--) {
        chartLabels.push(moment().subtract(i, 'days').format("D-MMM-YY"));
      }
    }
  });

  $("#txtAddStock").keyup(function(e) { // Enter key pressed
    if (e.keyCode === 13) {
      $("#btnAddStock").click();
    }
  });

  $(document).on("click", ".btnRemoveStock", function(e) {
    firebase.child(e.currentTarget.name).remove();
  });

  function getStockDataset(options, callbackFunction) {
    var stockDataStartDate = moment(options.datesToFill[0], "D-MMM-YY").subtract(10, 'days').format("D-MMM-YY");
    var stockDataEndDate = moment(options.datesToFill[options.datesToFill.length - 1], "D-MMM-YY").add(1, 'days').format("D-MMM-YY");

    var ticker = options.symbol;
    ticker = ticker.replace(':', '%3A');
    var url = 'https://www.google.com/finance/historical?q=' + ticker + '&startdate=' + stockDataStartDate + '&enddate=' + stockDataEndDate + '&output=csv';

    $.ajax({
      type: 'HEAD',
      crossDomain: true,
      dataType: 'csv',
      url: url,
      success: function() {


        Papa.parse(url, {
          download: true,
          complete: function(results, file) {
            var data = [options.symbol];
            for (i = 0; i < options.datesToFill.length; i++) {

              var jsFillDate = moment(options.datesToFill[i], "D-MMM-YY").toDate();

              for (j = results.data.length - 2; j >= 1; j--) {
                var jsDataDate = moment(results.data[j][0], "D-MMM-YY").toDate();
                if (jsFillDate >= jsDataDate) {
                  data[i + 1] = results.data[j][4];
                } else {
                  break;
                }
              }
            }
            callbackFunction(null, data);
          }
        });


      },
      error: function() {
        callbackFunction("Cannot find data for " + options.symbol, null);
      }
    });

  }

  function randChartColors() {
    var randColors = {};
    var rand1 = Math.floor(Math.random() * (256));
    var rand2 = Math.floor(Math.random() * (256));
    var rand3 = Math.floor(Math.random() * (256));

    randColors.fillColor = "rgba(" + rand1 + "," + rand2 + "," + rand3 + ",0.2)";
    randColors.strokeColor = "rgba(" + rand1 + "," + rand2 + "," + rand3 + ",1)";
    randColors.pointColor = "rgba(" + rand1 + "," + rand2 + "," + rand3 + ",1)";
    randColors.pointHighlightStroke = "rgba(" + rand1 + "," + rand2 + "," + rand3 + ",1)";

    return randColors;
  }

  function generateChart(datasetsToChart) {
    var data = {
      labels: chartLabels,
      datasets: []
    };

    for (i = 0; i < datasetsToChart.length; i++) {
      data.datasets.push(datasetsToChart[i]);
    }

    var options = {
      responsive: true,
      bezierCurve: true,
      bezierCurveTension: 0.2,
      multiTooltipTemplate: "<%= datasetLabel %> - <%= value %>",
    };

    if (stockChart !== undefined) {
      stockChart.destroy();
    }
    stockChart = new Chart(context).Line(data, options);
  }

  function updateNotFound() {
    if (notFound.length === 0) {
      $("#txtNotFound").html("");
    } else {
      $("#txtNotFound").html("Warning: Could not find data for: ");
      $("#txtNotFound").append(notFound[0]);
      for (i = 1; i < notFound.length; i++) {
        $("#txtNotFound").append(", " + notFound[i]);
      }
    }
  }
});
