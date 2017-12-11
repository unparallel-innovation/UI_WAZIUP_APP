var require = meteorInstall({"imports":{"api":{"apixu.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                             //
// imports/api/apixu.js                                                                        //
//                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                               //
module.export({
  apixu: () => apixu
});

function apixu(callback) {
  Meteor.call('getPage', 'http://api.apixu.com/v1/forecast.json?key=05d72599bed946d8983155015170512&q=Caparica', function (err, apixuData) {
    Meteor.call('getPage', 'http://api.apixu.com/v1/current.json?key=05d72599bed946d8983155015170512&q=Caparica', function (err, apixuDataCurrent) {
      var apixuParsedData = [];
      var apixuParsedCurrentData = {};

      if (apixuData.data) {
        if (apixuData.data.forecast) {
          if (apixuData.data.forecast.forecastday) {
            if (apixuData.data.forecast.forecastday[0]) {
              if (apixuData.data.forecast.forecastday[0].hour) {
                apixuData.data.forecast.forecastday[0].hour.forEach(hour => {
                  apixuParsedData.push({
                    temperature: hour.temp_c,
                    humidity: hour.humidity,
                    date: new Date(hour.time_epoch * 1000).getTime()
                  });
                });
              }
            }
          }
        }
      }

      if (apixuDataCurrent.data) {
        if (apixuDataCurrent.data.current) {
          apixuParsedCurrentData = {
            date: new Date(apixuDataCurrent.data.current.last_updated_epoch * 1000).getTime(),
            temperature: apixuDataCurrent.data.current.temp_c,
            humidity: apixuDataCurrent.data.current.humidity
          };
        }
      }

      apixuParsedData.sort(function (a, b) {
        return a.date > b.date ? 1 : b.date > a.date ? -1 : 0;
      });
      callback({
        historic: apixuParsedData,
        current: apixuParsedCurrentData
      });
    });
  });
}
/////////////////////////////////////////////////////////////////////////////////////////////////

},"darkSky.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                             //
// imports/api/darkSky.js                                                                      //
//                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                               //
module.export({
  darkSky: () => darkSky
});

function darkSky(callback) {
  var currentTime = Math.round(new Date().getTime() / 1000);
  Meteor.call('getPage', 'https://api.darksky.net/forecast/7902d68f0b5648cce7b9b12139451974/38.67,-9.2,' + currentTime + '?units=si', function (err, darkSkyData) {
    //Meteor.call('getPage','http://www.sapo.pt',function(err,darkSkyData){
    var darkSkyParsedData = [];
    var darkSkyParsedCurrentData = {};

    if (darkSkyData) {
      if (darkSkyData.data) {
        if (darkSkyData.data.hourly) {
          if (darkSkyData.data.hourly.data) {
            darkSkyData.data.hourly.data.forEach(data => {
              darkSkyParsedData.push({
                temperature: data.temperature,
                humidity: data.humidity * 100,
                date: new Date(data.time * 1000).getTime()
              });
            });
          }
        }
      }
    }

    if (darkSkyData.data) {
      if (darkSkyData.data.currently) {
        darkSkyParsedCurrentData = {
          date: new Date(darkSkyData.data.currently.time * 1000).getTime(),
          temperature: darkSkyData.data.currently.temperature,
          humidity: darkSkyData.data.currently.humidity * 100
        };
      }
    }

    darkSkyParsedData.sort(function (a, b) {
      return a.date > b.date ? 1 : b.date > a.date ? -1 : 0;
    });
    callback({
      historic: darkSkyParsedData,
      current: darkSkyParsedCurrentData
    });
  });
}
/////////////////////////////////////////////////////////////////////////////////////////////////

},"data.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                             //
// imports/api/data.js                                                                         //
//                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                               //
module.export({
  postDataLoader: () => postDataLoader
});
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let HTTP;
module.watch(require("meteor/http"), {
  HTTP(v) {
    HTTP = v;
  }

}, 1);
let weatherStation;
module.watch(require("./weatherStation.js"), {
  weatherStation(v) {
    weatherStation = v;
  }

}, 2);
let apixu;
module.watch(require("./apixu.js"), {
  apixu(v) {
    apixu = v;
  }

}, 3);
let darkSky;
module.watch(require("./darkSky.js"), {
  darkSky(v) {
    darkSky = v;
  }

}, 4);
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 5);

const callService = (type, url, options) => new Promise((resolve, reject) => {
  HTTP.call(type, url, options, (error, result) => {
    if (error) {
      reject(error);
    } else {
      resolve(result);
    }
  });
});

function getDiffVector(weatherStationData, dataVect) {
  var iTemp = 0;
  var iHumidity = 0;
  var diffTemp = [];
  var diffHumidity = [];
  var diff = [];

  if (dataVect.historic) {
    dataVect.historic.forEach(record => {
      var sumTemperature = null;
      var sumHumidity = null;
      var nTemperature = 0;
      var nHumidity = 0;
      var actualTime = new Date().getTime();

      if (record.date < actualTime) {
        if (weatherStationData.historic) {
          for (var i = 0; i < weatherStationData.historic.length; i++) {
            var delta = record.date - weatherStationData.historic[i].date;

            if (delta < 3600000 && delta > 0) {
              if (weatherStationData.historic[i].temperature) {
                sumTemperature = sumTemperature + weatherStationData.historic[i].temperature;
                nTemperature = nTemperature + 1;
              }

              if (weatherStationData.historic[i].humidity) {
                sumHumidity = sumHumidity + weatherStationData.historic[i].humidity;
                nHumidity = nHumidity + 1;
              }
            } else if (delta < 0) {
              break;
            }
          }

          if (sumTemperature && sumHumidity) {
            diff.push({
              date: record.date,
              temperature: Math.abs(sumTemperature / nTemperature - record.temperature),
              humidity: Math.abs(sumHumidity / nHumidity - record.humidity)
            });
          }
        }
      }
    });
  }

  return diff;
}

function postDataLoader(props, onData, e) {
  // load data from the server. (using props.id to identify the post)
  // (Here'll we'll use setTimeout for demonstration purpose)
  weatherStation(function (weatherStationData) {
    apixu(function (apixuData) {
      darkSky(function (darkSkyData) {
        apixuData.diff = getDiffVector(weatherStationData, apixuData);
        darkSkyData.diff = getDiffVector(weatherStationData, darkSkyData);
        onData(null, {
          weatherStation: weatherStationData,
          apixu: apixuData,
          darkSky: darkSkyData
        });
      });
    });
  });
}

if (Meteor.isServer) {
  Meteor.methods({
    getPage(url, options) {
      return callService('GET', url, options).then(result => result).catch(error => {
        throw new Meteor.Error('500', `${error.message}`);
      });
    }

  });
}
/////////////////////////////////////////////////////////////////////////////////////////////////

},"weatherStation.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                             //
// imports/api/weatherStation.js                                                               //
//                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                               //
module.export({
  weatherStation: () => weatherStation
});

function weatherStation(callback) {
  Meteor.call('getPage', 'http://elasticsearch.waziup.io/waziup-ui-weather/_search?q=name:WeatherStationUI&sort=time:desc&size=6000', function (err, weatherStationData) {
    Meteor.call('getPage', 'http://broker.waziup.io/v2/entities/WeatherStationUI', {
      headers: {
        "Fiware-ServicePath": "/UI/WEATHER",
        "Fiware-Service": "waziup"
      }
    }, function (err, weatherStationDataCurrent) {
      var WSParsedData = [];
      var WSCurrentData = {};
      var d = new Date();
      d.setHours(0, 0, 0, 0);
      var midnight = d.getTime();

      if (weatherStationData.data) {
        if (weatherStationData.data.hits) {
          if (weatherStationData.data.hits.hits) {
            if (weatherStationData.data.hits.hits.length) {
              weatherStationData.data.hits.hits.forEach(hit => {
                if (new Date(hit._source.time).getTime() > midnight - 3600000) {
                  if (hit._source) {
                    if (hit._source.attribute == "TP") {
                      WSParsedData.push({
                        date: new Date(hit._source.time).getTime(),
                        temperature: hit._source.value
                      });
                    }

                    if (hit._source.attribute == "HD") {
                      WSParsedData.push({
                        date: new Date(hit._source.time).getTime(),
                        humidity: hit._source.value
                      });
                    }
                  }
                }
              });
            }
          }
        }
      }

      WSParsedData.sort(function (a, b) {
        return a.date > b.date ? 1 : b.date > a.date ? -1 : 0;
      });

      if (weatherStationDataCurrent.data) {
        if (weatherStationDataCurrent.data) {
          if (weatherStationDataCurrent.data.TP) {
            WSCurrentData.temperature = weatherStationDataCurrent.data.TP.value;
          }

          if (weatherStationDataCurrent.data.HD) {
            WSCurrentData.humidity = weatherStationDataCurrent.data.HD.value;
          }

          if (WSParsedData.length) {
            WSCurrentData.date = WSParsedData[WSParsedData.length - 1].date;
          }
        }
      }

      callback({
        historic: WSParsedData,
        current: WSCurrentData
      });
    });
  });
}
/////////////////////////////////////////////////////////////////////////////////////////////////

}}},"server":{"main.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                             //
// server/main.js                                                                              //
//                                                                                             //
/////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                               //
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
module.watch(require("../imports/api/data.js"));
Meteor.startup(() => {// code to run on server at startup
});
/////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json",
    ".jsx"
  ]
});
require("./server/main.js");
//# sourceURL=meteor://💻app/app/app.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvYXBpeHUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2RhcmtTa3kuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2RhdGEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL3dlYXRoZXJTdGF0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9zZXJ2ZXIvbWFpbi5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJhcGl4dSIsImNhbGxiYWNrIiwiTWV0ZW9yIiwiY2FsbCIsImVyciIsImFwaXh1RGF0YSIsImFwaXh1RGF0YUN1cnJlbnQiLCJhcGl4dVBhcnNlZERhdGEiLCJhcGl4dVBhcnNlZEN1cnJlbnREYXRhIiwiZGF0YSIsImZvcmVjYXN0IiwiZm9yZWNhc3RkYXkiLCJob3VyIiwiZm9yRWFjaCIsInB1c2giLCJ0ZW1wZXJhdHVyZSIsInRlbXBfYyIsImh1bWlkaXR5IiwiZGF0ZSIsIkRhdGUiLCJ0aW1lX2Vwb2NoIiwiZ2V0VGltZSIsImN1cnJlbnQiLCJsYXN0X3VwZGF0ZWRfZXBvY2giLCJzb3J0IiwiYSIsImIiLCJoaXN0b3JpYyIsImRhcmtTa3kiLCJjdXJyZW50VGltZSIsIk1hdGgiLCJyb3VuZCIsImRhcmtTa3lEYXRhIiwiZGFya1NreVBhcnNlZERhdGEiLCJkYXJrU2t5UGFyc2VkQ3VycmVudERhdGEiLCJob3VybHkiLCJ0aW1lIiwiY3VycmVudGx5IiwicG9zdERhdGFMb2FkZXIiLCJ3YXRjaCIsInJlcXVpcmUiLCJ2IiwiSFRUUCIsIndlYXRoZXJTdGF0aW9uIiwibW9tZW50IiwiZGVmYXVsdCIsImNhbGxTZXJ2aWNlIiwidHlwZSIsInVybCIsIm9wdGlvbnMiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImVycm9yIiwicmVzdWx0IiwiZ2V0RGlmZlZlY3RvciIsIndlYXRoZXJTdGF0aW9uRGF0YSIsImRhdGFWZWN0IiwiaVRlbXAiLCJpSHVtaWRpdHkiLCJkaWZmVGVtcCIsImRpZmZIdW1pZGl0eSIsImRpZmYiLCJyZWNvcmQiLCJzdW1UZW1wZXJhdHVyZSIsInN1bUh1bWlkaXR5IiwiblRlbXBlcmF0dXJlIiwibkh1bWlkaXR5IiwiYWN0dWFsVGltZSIsImkiLCJsZW5ndGgiLCJkZWx0YSIsImFicyIsInByb3BzIiwib25EYXRhIiwiZSIsImlzU2VydmVyIiwibWV0aG9kcyIsImdldFBhZ2UiLCJ0aGVuIiwiY2F0Y2giLCJFcnJvciIsIm1lc3NhZ2UiLCJoZWFkZXJzIiwid2VhdGhlclN0YXRpb25EYXRhQ3VycmVudCIsIldTUGFyc2VkRGF0YSIsIldTQ3VycmVudERhdGEiLCJkIiwic2V0SG91cnMiLCJtaWRuaWdodCIsImhpdHMiLCJoaXQiLCJfc291cmNlIiwiYXR0cmlidXRlIiwidmFsdWUiLCJUUCIsIkhEIiwic3RhcnR1cCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQUEsT0FBT0MsTUFBUCxDQUFjO0FBQUNDLFNBQU0sTUFBSUE7QUFBWCxDQUFkOztBQUVBLFNBQVNBLEtBQVQsQ0FBZUMsUUFBZixFQUF3QjtBQUN0QkMsU0FBT0MsSUFBUCxDQUFZLFNBQVosRUFBc0Isc0ZBQXRCLEVBQTZHLFVBQVNDLEdBQVQsRUFBYUMsU0FBYixFQUF1QjtBQUNsSUgsV0FBT0MsSUFBUCxDQUFZLFNBQVosRUFBc0IscUZBQXRCLEVBQTRHLFVBQVNDLEdBQVQsRUFBYUUsZ0JBQWIsRUFBOEI7QUFDeEksVUFBSUMsa0JBQWtCLEVBQXRCO0FBQ0EsVUFBSUMseUJBQXlCLEVBQTdCOztBQUNBLFVBQUdILFVBQVVJLElBQWIsRUFDQTtBQUNFLFlBQUdKLFVBQVVJLElBQVYsQ0FBZUMsUUFBbEIsRUFBMkI7QUFDekIsY0FBR0wsVUFBVUksSUFBVixDQUFlQyxRQUFmLENBQXdCQyxXQUEzQixFQUF1QztBQUNyQyxnQkFBR04sVUFBVUksSUFBVixDQUFlQyxRQUFmLENBQXdCQyxXQUF4QixDQUFvQyxDQUFwQyxDQUFILEVBQTBDO0FBQ3hD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LEtBQTlEO0FBQ0Q7O0FBQ0QsY0FBR1YsMEJBQTBCM0UsSUFBMUIsQ0FBK0J1RixFQUFsQyxFQUFxQztBQUNuQ1YsMEJBQWNyRSxRQUFkLEdBQXlCbUUsMEJBQTBCM0UsSUFBMUIsQ0FBK0J1RixFQUEvQixDQUFrQ0YsS0FBM0Q7QUFDRDs7QUFDRCxjQUFHVCxhQUFhZixNQUFoQixFQUF1QjtBQUNyQmdCLDBCQUFjcEUsSUFBZCxHQUFxQm1FLGFBQWFBLGFBQWFmLE1BQWIsR0FBb0IsQ0FBakMsRUFBb0NwRCxJQUF6RDtBQUNEO0FBQ0Y7QUFDRjs7QUFDRGpCLGVBQVM7QUFDUDBCLGtCQUFVMEQsWUFESDtBQUVQL0QsaUJBQVNnRTtBQUZGLE9BQVQ7QUFJSCxLQS9ERDtBQWlFRCxHQWxFRDtBQW1FRCxDOzs7Ozs7Ozs7OztBQ3ZFRCxJQUFJcEYsTUFBSjtBQUFXSixPQUFPeUMsS0FBUCxDQUFhQyxRQUFRLGVBQVIsQ0FBYixFQUFzQztBQUFDdEMsU0FBT3VDLENBQVAsRUFBUztBQUFDdkMsYUFBT3VDLENBQVA7QUFBUzs7QUFBcEIsQ0FBdEMsRUFBNEQsQ0FBNUQ7QUFBK0QzQyxPQUFPeUMsS0FBUCxDQUFhQyxRQUFRLHdCQUFSLENBQWI7QUFFMUV0QyxPQUFPK0YsT0FBUCxDQUFlLE1BQU0sQ0FDbkI7QUFDRCxDQUZELEUiLCJmaWxlIjoiL2FwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCB7YXBpeHV9XG5cbmZ1bmN0aW9uIGFwaXh1KGNhbGxiYWNrKXtcbiAgTWV0ZW9yLmNhbGwoJ2dldFBhZ2UnLCdodHRwOi8vYXBpLmFwaXh1LmNvbS92MS9mb3JlY2FzdC5qc29uP2tleT0wNWQ3MjU5OWJlZDk0NmQ4OTgzMTU1MDE1MTcwNTEyJnE9Q2FwYXJpY2EnLGZ1bmN0aW9uKGVycixhcGl4dURhdGEpe1xuICAgIE1ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cDovL2FwaS5hcGl4dS5jb20vdjEvY3VycmVudC5qc29uP2tleT0wNWQ3MjU5OWJlZDk0NmQ4OTgzMTU1MDE1MTcwNTEyJnE9Q2FwYXJpY2EnLGZ1bmN0aW9uKGVycixhcGl4dURhdGFDdXJyZW50KXtcbiAgICAgIHZhciBhcGl4dVBhcnNlZERhdGEgPSBbXTtcbiAgICAgIHZhciBhcGl4dVBhcnNlZEN1cnJlbnREYXRhID0ge307XG4gICAgICBpZihhcGl4dURhdGEuZGF0YSlcbiAgICAgIHtcbiAgICAgICAgaWYoYXBpeHVEYXRhLmRhdGEuZm9yZWNhc3Qpe1xuICAgICAgICAgIGlmKGFwaXh1RGF0YS5kYXRhLmZvcmVjYXN0LmZvcmVjYXN0ZGF5KXtcbiAgICAgICAgICAgIGlmKGFwaXh1RGF0YS5kYXRhLmZvcmVjYXN0LmZvcmVjYXN0ZGF5WzBdKXtcbiAgICAgICAgICAgICAgaWYoYXBpeHVEYXRhLmRhdGEuZm9yZWNhc3QuZm9yZWNhc3RkYXlbMF0uaG91cil7XG4gICAgICAgICAgICAgICAgYXBpeHVEYXRhLmRhdGEuZm9yZWNhc3QuZm9yZWNhc3RkYXlbMF0uaG91ci5mb3JFYWNoKGhvdXI9PntcbiAgICAgICAgICAgICAgICAgIGFwaXh1UGFyc2VkRGF0YS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgdGVtcGVyYXR1cmU6aG91ci50ZW1wX2MsXG4gICAgICAgICAgICAgICAgICAgIGh1bWlkaXR5OiBob3VyLmh1bWlkaXR5LFxuICAgICAgICAgICAgICAgICAgICBkYXRlOihuZXcgRGF0ZShob3VyLnRpbWVfZXBvY2gqMTAwMCkpLmdldFRpbWUoKVxuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmKGFwaXh1RGF0YUN1cnJlbnQuZGF0YSlcbiAgICAgIHtcbiAgICAgICAgaWYoYXBpeHVEYXRhQ3VycmVudC5kYXRhLmN1cnJlbnQpe1xuICAgICAgICAgIGFwaXh1UGFyc2VkQ3VycmVudERhdGEgPSB7XG4gICAgICAgICAgICBkYXRlOiAobmV3IERhdGUoYXBpeHVEYXRhQ3VycmVudC5kYXRhLmN1cnJlbnQubGFzdF91cGRhdGVkX2Vwb2NoKjEwMDApKS5nZXRUaW1lKCksXG4gICAgICAgICAgICB0ZW1wZXJhdHVyZTogYXBpeHVEYXRhQ3VycmVudC5kYXRhLmN1cnJlbnQudGVtcF9jLFxuICAgICAgICAgICAgaHVtaWRpdHk6IGFwaXh1RGF0YUN1cnJlbnQuZGF0YS5jdXJyZW50Lmh1bWlkaXR5XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBhcGl4dVBhcnNlZERhdGEuc29ydChmdW5jdGlvbihhLGIpIHtyZXR1cm4gKGEuZGF0ZSA+IGIuZGF0ZSkgPyAxIDogKChiLmRhdGUgPiBhLmRhdGUpID8gLTEgOiAwKTt9ICk7XG4gICAgICBjYWxsYmFjayh7XG4gICAgICAgIGhpc3RvcmljOiBhcGl4dVBhcnNlZERhdGEsXG4gICAgICAgIGN1cnJlbnQ6IGFwaXh1UGFyc2VkQ3VycmVudERhdGFcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcbn1cbiIsImV4cG9ydCB7ZGFya1NreX1cblxuZnVuY3Rpb24gZGFya1NreShjYWxsYmFjayl7XG4gIHZhciBjdXJyZW50VGltZSA9IE1hdGgucm91bmQoKG5ldyBEYXRlKCkpLmdldFRpbWUoKS8xMDAwKVxuICBNZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHBzOi8vYXBpLmRhcmtza3kubmV0L2ZvcmVjYXN0Lzc5MDJkNjhmMGI1NjQ4Y2NlN2I5YjEyMTM5NDUxOTc0LzM4LjY3LC05LjIsJytjdXJyZW50VGltZSsnP3VuaXRzPXNpJyxmdW5jdGlvbihlcnIsZGFya1NreURhdGEpe1xuICAvL01ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cDovL3d3dy5zYXBvLnB0JyxmdW5jdGlvbihlcnIsZGFya1NreURhdGEpe1xuICAgIHZhciBkYXJrU2t5UGFyc2VkRGF0YSA9IFtdO1xuICAgIHZhciBkYXJrU2t5UGFyc2VkQ3VycmVudERhdGEgPSB7fVxuICAgIGlmKGRhcmtTa3lEYXRhKXtcbiAgICAgIGlmKGRhcmtTa3lEYXRhLmRhdGEpe1xuICAgICAgICBpZihkYXJrU2t5RGF0YS5kYXRhLmhvdXJseSl7XG4gICAgICAgICAgaWYoZGFya1NreURhdGEuZGF0YS5ob3VybHkuZGF0YSl7XG4gICAgICAgICAgICBkYXJrU2t5RGF0YS5kYXRhLmhvdXJseS5kYXRhLmZvckVhY2goZGF0YT0+e1xuICAgICAgICAgICAgICBkYXJrU2t5UGFyc2VkRGF0YS5wdXNoKHtcbiAgICAgICAgICAgICAgICB0ZW1wZXJhdHVyZTpkYXRhLnRlbXBlcmF0dXJlLFxuICAgICAgICAgICAgICAgIGh1bWlkaXR5OiBkYXRhLmh1bWlkaXR5KjEwMCxcbiAgICAgICAgICAgICAgICBkYXRlOihuZXcgRGF0ZShkYXRhLnRpbWUqMTAwMCkpLmdldFRpbWUoKVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYoZGFya1NreURhdGEuZGF0YSlcbiAgICB7XG4gICAgICBpZihkYXJrU2t5RGF0YS5kYXRhLmN1cnJlbnRseSlcbiAgICAgIHtcbiAgICAgICAgZGFya1NreVBhcnNlZEN1cnJlbnREYXRhID0ge1xuICAgICAgICAgIGRhdGU6IChuZXcgRGF0ZShkYXJrU2t5RGF0YS5kYXRhLmN1cnJlbnRseS50aW1lKjEwMDApKS5nZXRUaW1lKCksXG4gICAgICAgICAgdGVtcGVyYXR1cmU6IGRhcmtTa3lEYXRhLmRhdGEuY3VycmVudGx5LnRlbXBlcmF0dXJlLFxuICAgICAgICAgIGh1bWlkaXR5OiBkYXJrU2t5RGF0YS5kYXRhLmN1cnJlbnRseS5odW1pZGl0eSoxMDBcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBkYXJrU2t5UGFyc2VkRGF0YS5zb3J0KGZ1bmN0aW9uKGEsYikge3JldHVybiAoYS5kYXRlID4gYi5kYXRlKSA/IDEgOiAoKGIuZGF0ZSA+IGEuZGF0ZSkgPyAtMSA6IDApO30gKTtcbiAgICBjYWxsYmFjayh7XG4gICAgICBoaXN0b3JpYzogZGFya1NreVBhcnNlZERhdGEsXG4gICAgICBjdXJyZW50OiBkYXJrU2t5UGFyc2VkQ3VycmVudERhdGFcbiAgICB9KTtcbiAgfSk7XG59XG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IEhUVFAgfSBmcm9tICdtZXRlb3IvaHR0cCc7XG5pbXBvcnQge3dlYXRoZXJTdGF0aW9ufSBmcm9tICcuL3dlYXRoZXJTdGF0aW9uLmpzJ1xuaW1wb3J0IHthcGl4dX0gZnJvbSAnLi9hcGl4dS5qcydcbmltcG9ydCB7ZGFya1NreX0gZnJvbSAnLi9kYXJrU2t5LmpzJ1xuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnXG5leHBvcnQge3Bvc3REYXRhTG9hZGVyfVxuXG5jb25zdCBjYWxsU2VydmljZSA9ICh0eXBlLCB1cmwsIG9wdGlvbnMpID0+IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgSFRUUC5jYWxsKHR5cGUsIHVybCwgb3B0aW9ucywgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIHJlamVjdChlcnJvcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICB9XG4gIH0pO1xufSk7XG5cbmZ1bmN0aW9uIGdldERpZmZWZWN0b3Iod2VhdGhlclN0YXRpb25EYXRhLGRhdGFWZWN0KXtcbiAgdmFyIGlUZW1wID0gMDtcbiAgdmFyIGlIdW1pZGl0eSA9IDA7XG4gIHZhciBkaWZmVGVtcCA9IFtdO1xuICB2YXIgZGlmZkh1bWlkaXR5ID0gW107XG4gIHZhciBkaWZmID0gW11cbiAgaWYoZGF0YVZlY3QuaGlzdG9yaWMpe1xuICAgIGRhdGFWZWN0Lmhpc3RvcmljLmZvckVhY2gocmVjb3JkPT57XG4gICAgICB2YXIgc3VtVGVtcGVyYXR1cmUgPSBudWxsO1xuICAgICAgdmFyIHN1bUh1bWlkaXR5ID0gbnVsbDtcbiAgICAgIHZhciBuVGVtcGVyYXR1cmUgPSAwO1xuICAgICAgdmFyIG5IdW1pZGl0eSA9IDA7XG4gICAgICB2YXIgYWN0dWFsVGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XG4gICAgICBpZihyZWNvcmQuZGF0ZTxhY3R1YWxUaW1lKVxuICAgICAge1xuICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGEuaGlzdG9yaWMpe1xuICAgICAgICAgIGZvcih2YXIgaT0wO2k8d2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljLmxlbmd0aDtpKyspXG4gICAgICAgICAge1xuICAgICAgICAgICAgdmFyIGRlbHRhID0gcmVjb3JkLmRhdGUtd2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljW2ldLmRhdGVcbiAgICAgICAgICAgIGlmKGRlbHRhPDM2MDAwMDAgJiYgZGVsdGE+MCl7XG4gICAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YS5oaXN0b3JpY1tpXS50ZW1wZXJhdHVyZSlcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHN1bVRlbXBlcmF0dXJlID0gc3VtVGVtcGVyYXR1cmUgKyB3ZWF0aGVyU3RhdGlvbkRhdGEuaGlzdG9yaWNbaV0udGVtcGVyYXR1cmVcbiAgICAgICAgICAgICAgICBuVGVtcGVyYXR1cmUgPSBuVGVtcGVyYXR1cmUgKyAxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YS5oaXN0b3JpY1tpXS5odW1pZGl0eSlcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHN1bUh1bWlkaXR5ID0gc3VtSHVtaWRpdHkgKyB3ZWF0aGVyU3RhdGlvbkRhdGEuaGlzdG9yaWNbaV0uaHVtaWRpdHlcbiAgICAgICAgICAgICAgICBuSHVtaWRpdHkgPSBuSHVtaWRpdHkgKyAxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9ZWxzZSBpZihkZWx0YSA8MCl7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZihzdW1UZW1wZXJhdHVyZSAmJiBzdW1IdW1pZGl0eSlcbiAgICAgICAgICB7XG4gICAgICAgICAgICBkaWZmLnB1c2goe1xuICAgICAgICAgICAgICBkYXRlOiByZWNvcmQuZGF0ZSxcbiAgICAgICAgICAgICAgdGVtcGVyYXR1cmU6IE1hdGguYWJzKHN1bVRlbXBlcmF0dXJlL25UZW1wZXJhdHVyZSAtIHJlY29yZC50ZW1wZXJhdHVyZSksXG4gICAgICAgICAgICAgIGh1bWlkaXR5OiBNYXRoLmFicyhzdW1IdW1pZGl0eS9uSHVtaWRpdHkgLSByZWNvcmQuaHVtaWRpdHkpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICB9KVxuICB9XG4gIHJldHVybiBkaWZmXG59XG5cbmZ1bmN0aW9uIHBvc3REYXRhTG9hZGVyKHByb3BzLCBvbkRhdGEsZSkge1xuICAgIC8vIGxvYWQgZGF0YSBmcm9tIHRoZSBzZXJ2ZXIuICh1c2luZyBwcm9wcy5pZCB0byBpZGVudGlmeSB0aGUgcG9zdClcbiAgICAvLyAoSGVyZSdsbCB3ZSdsbCB1c2Ugc2V0VGltZW91dCBmb3IgZGVtb25zdHJhdGlvbiBwdXJwb3NlKVxuICAgIHdlYXRoZXJTdGF0aW9uKGZ1bmN0aW9uKHdlYXRoZXJTdGF0aW9uRGF0YSl7XG4gICAgICBhcGl4dShmdW5jdGlvbihhcGl4dURhdGEpe1xuICAgICAgICBkYXJrU2t5KGZ1bmN0aW9uKGRhcmtTa3lEYXRhKXtcbiAgICAgICAgICBhcGl4dURhdGEuZGlmZiA9IGdldERpZmZWZWN0b3Iod2VhdGhlclN0YXRpb25EYXRhLGFwaXh1RGF0YSlcbiAgICAgICAgICBkYXJrU2t5RGF0YS5kaWZmID0gZ2V0RGlmZlZlY3Rvcih3ZWF0aGVyU3RhdGlvbkRhdGEsZGFya1NreURhdGEpXG4gICAgICAgICAgb25EYXRhKG51bGwsIHtcbiAgICAgICAgICAgIHdlYXRoZXJTdGF0aW9uOiB3ZWF0aGVyU3RhdGlvbkRhdGEsXG4gICAgICAgICAgICBhcGl4dTogYXBpeHVEYXRhLFxuICAgICAgICAgICAgZGFya1NreTogZGFya1NreURhdGFcbiAgICAgICAgICB9KVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pXG59XG5pZihNZXRlb3IuaXNTZXJ2ZXIpe1xuICBNZXRlb3IubWV0aG9kcyh7XG4gICAgZ2V0UGFnZSh1cmwsb3B0aW9ucykge1xuICAgICAgcmV0dXJuIGNhbGxTZXJ2aWNlKFxuICAgICAgICAnR0VUJyxcbiAgICAgICAgdXJsLFxuICAgICAgICBvcHRpb25zXG4gICAgICApLnRoZW4oKHJlc3VsdCkgPT4gcmVzdWx0KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcignNTAwJywgYCR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gIH0pO1xufVxuIiwiZXhwb3J0IHt3ZWF0aGVyU3RhdGlvbn1cblxuZnVuY3Rpb24gd2VhdGhlclN0YXRpb24oY2FsbGJhY2spe1xuXG4gIE1ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cDovL2VsYXN0aWNzZWFyY2gud2F6aXVwLmlvL3dheml1cC11aS13ZWF0aGVyL19zZWFyY2g/cT1uYW1lOldlYXRoZXJTdGF0aW9uVUkmc29ydD10aW1lOmRlc2Mmc2l6ZT02MDAwJyxmdW5jdGlvbihlcnIsd2VhdGhlclN0YXRpb25EYXRhKXtcbiAgICBNZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHA6Ly9icm9rZXIud2F6aXVwLmlvL3YyL2VudGl0aWVzL1dlYXRoZXJTdGF0aW9uVUknLHtcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICBcIkZpd2FyZS1TZXJ2aWNlUGF0aFwiOlwiL1VJL1dFQVRIRVJcIixcbiAgICAgICAgICBcIkZpd2FyZS1TZXJ2aWNlXCI6XCJ3YXppdXBcIlxuICAgICAgICB9XG4gICAgICB9LGZ1bmN0aW9uKGVycix3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50KXtcbiAgICAgICAgdmFyIFdTUGFyc2VkRGF0YSA9IFtdO1xuICAgICAgICB2YXIgV1NDdXJyZW50RGF0YSA9IHt9XG4gICAgICAgIHZhciBkID0gbmV3IERhdGUoKTtcbiAgICAgICAgZC5zZXRIb3VycygwLDAsMCwwKTtcbiAgICAgICAgdmFyIG1pZG5pZ2h0ID0gZC5nZXRUaW1lKCk7XG4gICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YS5kYXRhKVxuICAgICAgICB7XG4gICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhLmRhdGEuaGl0cylcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGEuZGF0YS5oaXRzLmhpdHMpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YS5kYXRhLmhpdHMuaGl0cy5sZW5ndGgpXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICB3ZWF0aGVyU3RhdGlvbkRhdGEuZGF0YS5oaXRzLmhpdHMuZm9yRWFjaChoaXQ9PntcbiAgICAgICAgICAgICAgICAgIGlmKChuZXcgRGF0ZShoaXQuX3NvdXJjZS50aW1lKSkuZ2V0VGltZSgpPm1pZG5pZ2h0LTM2MDAwMDApe1xuICAgICAgICAgICAgICAgICAgICBpZihoaXQuX3NvdXJjZSlcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgIGlmKGhpdC5fc291cmNlLmF0dHJpYnV0ZT09XCJUUFwiKVxuICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFdTUGFyc2VkRGF0YS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZToobmV3IERhdGUoaGl0Ll9zb3VyY2UudGltZSkpLmdldFRpbWUoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcGVyYXR1cmU6aGl0Ll9zb3VyY2UudmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIGlmKGhpdC5fc291cmNlLmF0dHJpYnV0ZT09XCJIRFwiKVxuICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFdTUGFyc2VkRGF0YS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZToobmV3IERhdGUoaGl0Ll9zb3VyY2UudGltZSkpLmdldFRpbWUoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgaHVtaWRpdHk6aGl0Ll9zb3VyY2UudmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBXU1BhcnNlZERhdGEuc29ydChmdW5jdGlvbihhLGIpIHtyZXR1cm4gKGEuZGF0ZSA+IGIuZGF0ZSkgPyAxIDogKChiLmRhdGUgPiBhLmRhdGUpID8gLTEgOiAwKTt9ICk7XG4gICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YUN1cnJlbnQuZGF0YSlcbiAgICAgICAge1xuICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YUN1cnJlbnQuZGF0YSl7XG4gICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50LmRhdGEuVFApe1xuICAgICAgICAgICAgICBXU0N1cnJlbnREYXRhLnRlbXBlcmF0dXJlID0gd2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhLlRQLnZhbHVlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50LmRhdGEuSEQpe1xuICAgICAgICAgICAgICBXU0N1cnJlbnREYXRhLmh1bWlkaXR5ID0gd2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhLkhELnZhbHVlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihXU1BhcnNlZERhdGEubGVuZ3RoKXtcbiAgICAgICAgICAgICAgV1NDdXJyZW50RGF0YS5kYXRlID0gV1NQYXJzZWREYXRhW1dTUGFyc2VkRGF0YS5sZW5ndGgtMV0uZGF0ZVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgaGlzdG9yaWM6IFdTUGFyc2VkRGF0YSxcbiAgICAgICAgICBjdXJyZW50OiBXU0N1cnJlbnREYXRhXG4gICAgICAgIH0pO1xuICAgIH0pXG5cbiAgfSlcbn1cbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0ICcuLi9pbXBvcnRzL2FwaS9kYXRhLmpzJ1xuTWV0ZW9yLnN0YXJ0dXAoKCkgPT4ge1xuICAvLyBjb2RlIHRvIHJ1biBvbiBzZXJ2ZXIgYXQgc3RhcnR1cFxufSk7XG4iXX0=
