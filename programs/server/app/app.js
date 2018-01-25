var require = meteorInstall({"imports":{"api":{"apixu.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/apixu.js                                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  apixu: () => apixu
});
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 0);

function apixu(callback, startDate, config) {
  var location = config && config.location ? config.location : "38.67,-9.2";
  var formatedDate = moment(startDate).format('YYYY-MM-DD');
  Meteor.call('getPage', 'http://api.apixu.com/v1/history.json?key=05d72599bed946d8983155015170512&q=' + location + '&dt=' + formatedDate, {
    timeout: 15000
  }, function (err, apixuData) {
    Meteor.call('getPage', 'http://api.apixu.com/v1/current.json?key=05d72599bed946d8983155015170512&q=' + location, {
      timeout: 15000
    }, function (err, apixuDataCurrent) {
      var apixuParsedData = [];
      var apixuParsedCurrentData = {};

      if (apixuData && apixuData.data && apixuData.data.forecast && apixuData.data.forecast.forecastday && apixuData.data.forecast.forecastday[0] && apixuData.data.forecast.forecastday[0].hour) {
        apixuData.data.forecast.forecastday[0].hour.forEach(hour => {
          apixuParsedData.push({
            temperature: hour.temp_c,
            humidity: hour.humidity,
            date: new Date(hour.time_epoch * 1000).getTime()
          });
        });
      }

      if (apixuDataCurrent && apixuDataCurrent.data && apixuDataCurrent.data.current) {
        apixuParsedCurrentData = {
          date: new Date(apixuDataCurrent.data.current.last_updated_epoch * 1000).getTime(),
          temperature: apixuDataCurrent.data.current.temp_c,
          humidity: apixuDataCurrent.data.current.humidity
        };
      }

      apixuParsedData.sort(function (a, b) {
        return a.date > b.date ? 1 : b.date > a.date ? -1 : 0;
      });
      callback({
        historic: apixuParsedData,
        current: apixuParsedCurrentData
      }, startDate);
    });
  });
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"darkSky.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/darkSky.js                                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  darkSky: () => darkSky
});

function darkSky(callback, startDate, config) {
  var location = config && config.location ? config.location : "38.67,-9.2";
  var currentTime = Math.round(new Date(startDate).getTime() / 1000);
  Meteor.call('getPage', 'https://api.darksky.net/forecast/7902d68f0b5648cce7b9b12139451974/' + location + ',' + currentTime + '?units=si', {
    timeout: 15000
  }, function (err, darkSkyData) {
    Meteor.call('getPage', 'https://api.darksky.net/forecast/7902d68f0b5648cce7b9b12139451974/' + location + '?units=si', {
      timeout: 15000
    }, function (err, darkSkyDataLast) {
      //Meteor.call('getPage','http://www.sapo.pt',function(err,darkSkyData){
      var darkSkyParsedData = [];
      var darkSkyParsedCurrentData = {};

      if (darkSkyData && darkSkyData.data && darkSkyData.data.hourly && darkSkyData.data.hourly.data) {
        darkSkyData.data.hourly.data.forEach(data => {
          darkSkyParsedData.push({
            temperature: data.temperature,
            humidity: data.humidity * 100,
            date: new Date(data.time * 1000).getTime()
          });
        });
      }

      if (darkSkyDataLast && darkSkyDataLast.data && darkSkyDataLast.data.currently) {
        darkSkyParsedCurrentData = {
          date: new Date(darkSkyDataLast.data.currently.time * 1000).getTime(),
          temperature: darkSkyDataLast.data.currently.temperature,
          humidity: darkSkyDataLast.data.currently.humidity * 100
        };
      }

      darkSkyParsedData.sort(function (a, b) {
        return a.date > b.date ? 1 : b.date > a.date ? -1 : 0;
      });
      callback({
        historic: darkSkyParsedData,
        current: darkSkyParsedCurrentData
      }, startDate);
    });
  });
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"data.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/data.js                                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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

            if (delta < 3600000) {
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

function postDataLoader(props, onData, env) {
  var config = env.config ? env.config : {};
  var date = new Date(props.match.params.date).getTime();
  var d = new Date();
  d.setHours(0, 0, 0, 0);
  var midnight = d.getTime();
  var startDate = date ? date : midnight; // load data from the server. (using props.id to identify the post)
  // (Here'll we'll use setTimeout for demonstration purpose)

  weatherStation(function (weatherStationData, startDate) {
    apixu(function (apixuData, startDate) {
      darkSky(function (darkSkyData, startDate) {
        apixuData.diff = getDiffVector(weatherStationData, apixuData);
        darkSkyData.diff = getDiffVector(weatherStationData, darkSkyData);
        onData(null, {
          weatherStation: weatherStationData,
          apixu: apixuData,
          darkSky: darkSkyData,
          startDate: moment(startDate).format('YYYY-MM-DD')
        });
      }, startDate, config);
    }, startDate, config);
  }, startDate, config);
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
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"weatherStation.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// imports/api/weatherStation.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  weatherStation: () => weatherStation
});
let moment;
module.watch(require("moment"), {
  default(v) {
    moment = v;
  }

}, 0);

function weatherStation(callback, startDate, config) {
  var elasticsearchUrl = config && config.elasticsearchUrl ? config.elasticsearchUrl : "";
  var elasticsearchSearchQuery = config && config.elasticsearchSearchQuery ? config.elasticsearchSearchQuery : "";
  var brokerUrl = config && config.brokerUrl ? config.brokerUrl : "";
  var fiwareServicePath = config && config.fiwareServicePath ? config.fiwareServicePath : "";
  var fiwareService = config && config.fiwareService ? config.fiwareService : "";
  var formatedDate = moment(startDate).format('YYYY-MM-DD');
  Meteor.call('getPage', elasticsearchUrl + '?q=' + elasticsearchSearchQuery + '&sort=time:desc&size=6000&q=time:' + formatedDate, {
    timeout: 15000
  }, function (err, weatherStationData) {
    Meteor.call('getPage', elasticsearchUrl + '?q=' + elasticsearchSearchQuery + '&sort=time:desc&size=1', {
      timeout: 15000
    }, function (err, weatherStationDataLast) {
      Meteor.call('getPage', brokerUrl, {
        headers: {
          "Fiware-ServicePath": fiwareServicePath,
          "Fiware-Service": fiwareService
        },
        timeout: 15000
      }, function (err, weatherStationDataCurrent) {
        var WSParsedData = [];
        var WSCurrentData = {};
        var d = new Date();
        d.setHours(0, 0, 0, 0);
        var midnight = d.getTime();

        if (weatherStationData && weatherStationData.data && weatherStationData.data.hits && weatherStationData.data.hits.hits && weatherStationData.data.hits.hits.length) {
          weatherStationData.data.hits.hits.forEach(hit => {
            if (new Date(hit._source.time).getTime() > midnight - 3600000 || true) {
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

        WSParsedData.sort(function (a, b) {
          return a.date > b.date ? 1 : b.date > a.date ? -1 : 0;
        });

        if (weatherStationDataCurrent && weatherStationDataCurrent.data) {
          var temperature = null;

          for (var i = WSParsedData.length - 1; i > 0; i--) {
            if (WSParsedData[i].temperature) {
              temperature = WSParsedData[i].temperature;
              break;
            }
          }

          var humidity = null;

          for (var i = WSParsedData.length - 1; i > 0; i--) {
            if (WSParsedData[i].humidity) {
              humidity = WSParsedData[i].humidity;
              break;
            }
          }

          if (weatherStationDataCurrent.data.TP) {
            WSCurrentData.temperature = weatherStationDataCurrent.data.TP.value; //WSCurrentData.temperature = temperature
          }

          if (weatherStationDataCurrent.data.HD) {
            WSCurrentData.humidity = weatherStationDataCurrent.data.HD.value; //WSCurrentData.humidity = humidity
          }

          var lastDate = null;

          if (weatherStationDataLast && weatherStationDataLast.data && weatherStationDataLast.data.hits && weatherStationDataLast.data.hits.hits && weatherStationDataLast.data.hits.hits.length) {
            lastDate = weatherStationDataLast.data.hits.hits[0].sort[0];
          }

          if (WSParsedData.length) {
            WSCurrentData.date = lastDate; //WSCurrentData.date = WSParsedData[WSParsedData.length-1].date
          }
        }

        callback({
          historic: WSParsedData,
          current: WSCurrentData
        }, startDate);
      });
    });
  });
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"server":{"main.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// server/main.js                                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json",
    ".jsx"
  ]
});
require("./server/main.js");
//# sourceURL=meteor://💻app/app/app.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvYXBpeHUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2RhcmtTa3kuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2RhdGEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL3dlYXRoZXJTdGF0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9zZXJ2ZXIvbWFpbi5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJhcGl4dSIsIm1vbWVudCIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwiY2FsbGJhY2siLCJzdGFydERhdGUiLCJjb25maWciLCJsb2NhdGlvbiIsImZvcm1hdGVkRGF0ZSIsImZvcm1hdCIsIk1ldGVvciIsImNhbGwiLCJ0aW1lb3V0IiwiZXJyIiwiYXBpeHVEYXRhIiwiYXBpeHVEYXRhQ3VycmVudCIsImFwaXh1UGFyc2VkRGF0YSIsImFwaXh1UGFyc2VkQ3VycmVudERhdGEiLCJkYXRhIiwiZm9yZWNhc3QiLCJmb3JlY2FzdGRheSIsImhvdXIiLCJmb3JFYWNoIiwicHVzaCIsInRlbXBlcmF0dXJlIiwidGVtcF9jIiwiaHVtaWRpdHkiLCJkYXRlIiwiRGF0ZSIsInRpbWVfZXBvY2giLCJnZXRUaW1lIiwiY3VycmVudCIsImxhc3RfdXBkYXRlZF9lcG9jaCIsInNvcnQiLCJhIiwiYiIsImhpc3RvcmljIiwiZGFya1NreSIsImN1cnJlbnRUaW1lIiwiTWF0aCIsInJvdW5kIiwiZGFya1NreURhdGEiLCJkYXJrU2t5RGF0YUxhc3QiLCJkYXJrU2t5UGFyc2VkRGF0YSIsImRhcmtTa3lQYXJzZWRDdXJyZW50RGF0YSIsImhvdXJseSIsInRpbWUiLCJjdXJyZW50bHkiLCJwb3N0RGF0YUxvYWRlciIsIkhUVFAiLCJ3ZWF0aGVyU3RhdGlvbiIsImNhbGxTZXJ2aWNlIiwidHlwZSIsInVybCIsIm9wdGlvbnMiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImVycm9yIiwicmVzdWx0IiwiZ2V0RGlmZlZlY3RvciIsIndlYXRoZXJTdGF0aW9uRGF0YSIsImRhdGFWZWN0IiwiaVRlbXAiLCJpSHVtaWRpdHkiLCJkaWZmVGVtcCIsImRpZmZIdW1pZGl0eSIsImRpZmYiLCJyZWNvcmQiLCJzdW1UZW1wZXJhdHVyZSIsInN1bUh1bWlkaXR5IiwiblRlbXBlcmF0dXJlIiwibkh1bWlkaXR5IiwiYWN0dWFsVGltZSIsImkiLCJsZW5ndGgiLCJkZWx0YSIsImFicyIsInByb3BzIiwib25EYXRhIiwiZW52IiwibWF0Y2giLCJwYXJhbXMiLCJkIiwic2V0SG91cnMiLCJtaWRuaWdodCIsImlzU2VydmVyIiwibWV0aG9kcyIsImdldFBhZ2UiLCJ0aGVuIiwiY2F0Y2giLCJFcnJvciIsIm1lc3NhZ2UiLCJlbGFzdGljc2VhcmNoVXJsIiwiZWxhc3RpY3NlYXJjaFNlYXJjaFF1ZXJ5IiwiYnJva2VyVXJsIiwiZml3YXJlU2VydmljZVBhdGgiLCJmaXdhcmVTZXJ2aWNlIiwid2VhdGhlclN0YXRpb25EYXRhTGFzdCIsImhlYWRlcnMiLCJ3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50IiwiV1NQYXJzZWREYXRhIiwiV1NDdXJyZW50RGF0YSIsImhpdHMiLCJoaXQiLCJfc291cmNlIiwiYXR0cmlidXRlIiwidmFsdWUiLCJUUCIsIkhEIiwibGFzdERhdGUiLCJzdGFydHVwIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBQSxPQUFPQyxNQUFQLENBQWM7QUFBQ0MsU0FBTSxNQUFJQTtBQUFYLENBQWQ7QUFBaUMsSUFBSUMsTUFBSjtBQUFXSCxPQUFPSSxLQUFQLENBQWFDLFFBQVEsUUFBUixDQUFiLEVBQStCO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDSixhQUFPSSxDQUFQO0FBQVM7O0FBQXJCLENBQS9CLEVBQXNELENBQXREOztBQUU1QyxTQUFTTCxLQUFULENBQWVNLFFBQWYsRUFBd0JDLFNBQXhCLEVBQWtDQyxNQUFsQyxFQUF5QztBQUN2QyxN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LHVCQUF1QmhGLElBQWpELElBQXlEZ0YsdUJBQXVCaEYsSUFBdkIsQ0FBNEJxRixJQUFyRixJQUE2RkwsdUJBQXVCaEYsSUFBdkIsQ0FBNEJxRixJQUE1QixDQUFpQ0EsSUFBOUgsSUFBc0lMLHVCQUF1QmhGLElBQXZCLENBQTRCcUYsSUFBNUIsQ0FBaUNBLElBQWpDLENBQXNDNUIsTUFBL0ssRUFBc0w7QUFDcExtQyx1QkFBV1osdUJBQXVCaEYsSUFBdkIsQ0FBNEJxRixJQUE1QixDQUFpQ0EsSUFBakMsQ0FBc0MsQ0FBdEMsRUFBeUN0RSxJQUF6QyxDQUE4QyxDQUE5QyxDQUFYO0FBQ0Q7O0FBQ0QsY0FBR29FLGFBQWExQixNQUFoQixFQUF1QjtBQUNyQjJCLDBCQUFjM0UsSUFBZCxHQUFxQm1GLFFBQXJCLENBRHFCLENBRXJCO0FBQ0Q7QUFFRjs7QUFDRDFHLGlCQUFTO0FBQ1BnQyxvQkFBVWlFLFlBREg7QUFFUHRFLG1CQUFTdUU7QUFGRixTQUFULEVBR0VqRyxTQUhGO0FBSUgsT0E3RUQ7QUE4RUQsS0EvRUQ7QUFnRkQsR0FqRkQ7QUFrRkQsQzs7Ozs7Ozs7Ozs7QUM1RkQsSUFBSUssTUFBSjtBQUFXZCxPQUFPSSxLQUFQLENBQWFDLFFBQVEsZUFBUixDQUFiLEVBQXNDO0FBQUNTLFNBQU9QLENBQVAsRUFBUztBQUFDTyxhQUFPUCxDQUFQO0FBQVM7O0FBQXBCLENBQXRDLEVBQTRELENBQTVEO0FBQStEUCxPQUFPSSxLQUFQLENBQWFDLFFBQVEsd0JBQVIsQ0FBYjtBQUUxRVMsT0FBT3FHLE9BQVAsQ0FBZSxNQUFNLENBQ25CO0FBRUQsQ0FIRCxFIiwiZmlsZSI6Ii9hcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQge2FwaXh1fVxuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnXG5mdW5jdGlvbiBhcGl4dShjYWxsYmFjayxzdGFydERhdGUsY29uZmlnKXtcbiAgdmFyIGxvY2F0aW9uID0gY29uZmlnICYmIGNvbmZpZy5sb2NhdGlvbj9jb25maWcubG9jYXRpb246XCIzOC42NywtOS4yXCI7XG4gIHZhciBmb3JtYXRlZERhdGUgPSBtb21lbnQoc3RhcnREYXRlKS5mb3JtYXQoJ1lZWVktTU0tREQnKVxuICBNZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHA6Ly9hcGkuYXBpeHUuY29tL3YxL2hpc3RvcnkuanNvbj9rZXk9MDVkNzI1OTliZWQ5NDZkODk4MzE1NTAxNTE3MDUxMiZxPScrbG9jYXRpb24rJyZkdD0nK2Zvcm1hdGVkRGF0ZSx7dGltZW91dDoxNTAwMH0sZnVuY3Rpb24oZXJyLGFwaXh1RGF0YSl7XG4gICAgTWV0ZW9yLmNhbGwoJ2dldFBhZ2UnLCdodHRwOi8vYXBpLmFwaXh1LmNvbS92MS9jdXJyZW50Lmpzb24/a2V5PTA1ZDcyNTk5YmVkOTQ2ZDg5ODMxNTUwMTUxNzA1MTImcT0nK2xvY2F0aW9uLHt0aW1lb3V0OjE1MDAwfSxmdW5jdGlvbihlcnIsYXBpeHVEYXRhQ3VycmVudCl7XG4gICAgICB2YXIgYXBpeHVQYXJzZWREYXRhID0gW107XG4gICAgICB2YXIgYXBpeHVQYXJzZWRDdXJyZW50RGF0YSA9IHt9O1xuICAgICAgaWYoYXBpeHVEYXRhICYmIGFwaXh1RGF0YS5kYXRhICYmIGFwaXh1RGF0YS5kYXRhLmZvcmVjYXN0ICYmIGFwaXh1RGF0YS5kYXRhLmZvcmVjYXN0LmZvcmVjYXN0ZGF5ICYmICBhcGl4dURhdGEuZGF0YS5mb3JlY2FzdC5mb3JlY2FzdGRheVswXSAmJiBhcGl4dURhdGEuZGF0YS5mb3JlY2FzdC5mb3JlY2FzdGRheVswXS5ob3VyKXtcblxuICAgICAgICBhcGl4dURhdGEuZGF0YS5mb3JlY2FzdC5mb3JlY2FzdGRheVswXS5ob3VyLmZvckVhY2goaG91cj0+e1xuICAgICAgICAgIGFwaXh1UGFyc2VkRGF0YS5wdXNoKHtcbiAgICAgICAgICAgIHRlbXBlcmF0dXJlOmhvdXIudGVtcF9jLFxuICAgICAgICAgICAgaHVtaWRpdHk6IGhvdXIuaHVtaWRpdHksXG4gICAgICAgICAgICBkYXRlOihuZXcgRGF0ZShob3VyLnRpbWVfZXBvY2gqMTAwMCkpLmdldFRpbWUoKVxuICAgICAgICAgIH0pXG4gICAgICAgIH0pXG5cblxuICAgICAgfVxuICAgICAgaWYoYXBpeHVEYXRhQ3VycmVudCAmJiBhcGl4dURhdGFDdXJyZW50LmRhdGEgJiYgYXBpeHVEYXRhQ3VycmVudC5kYXRhLmN1cnJlbnQpe1xuICAgICAgICBhcGl4dVBhcnNlZEN1cnJlbnREYXRhID0ge1xuICAgICAgICAgIGRhdGU6IChuZXcgRGF0ZShhcGl4dURhdGFDdXJyZW50LmRhdGEuY3VycmVudC5sYXN0X3VwZGF0ZWRfZXBvY2gqMTAwMCkpLmdldFRpbWUoKSxcbiAgICAgICAgICB0ZW1wZXJhdHVyZTogYXBpeHVEYXRhQ3VycmVudC5kYXRhLmN1cnJlbnQudGVtcF9jLFxuICAgICAgICAgIGh1bWlkaXR5OiBhcGl4dURhdGFDdXJyZW50LmRhdGEuY3VycmVudC5odW1pZGl0eVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBhcGl4dVBhcnNlZERhdGEuc29ydChmdW5jdGlvbihhLGIpIHtyZXR1cm4gKGEuZGF0ZSA+IGIuZGF0ZSkgPyAxIDogKChiLmRhdGUgPiBhLmRhdGUpID8gLTEgOiAwKTt9ICk7XG4gICAgICBjYWxsYmFjayh7XG4gICAgICAgIGhpc3RvcmljOiBhcGl4dVBhcnNlZERhdGEsXG4gICAgICAgIGN1cnJlbnQ6IGFwaXh1UGFyc2VkQ3VycmVudERhdGFcbiAgICAgIH0sc3RhcnREYXRlKTtcbiAgICB9KTtcbiAgfSk7XG59XG4iLCJleHBvcnQge2RhcmtTa3l9XG5cbmZ1bmN0aW9uIGRhcmtTa3koY2FsbGJhY2ssc3RhcnREYXRlLGNvbmZpZyl7XG5cbiAgdmFyIGxvY2F0aW9uID0gY29uZmlnICYmIGNvbmZpZy5sb2NhdGlvbiA/Y29uZmlnLmxvY2F0aW9uOlwiMzguNjcsLTkuMlwiO1xuICB2YXIgY3VycmVudFRpbWUgPSBNYXRoLnJvdW5kKChuZXcgRGF0ZShzdGFydERhdGUpKS5nZXRUaW1lKCkvMTAwMClcbiAgTWV0ZW9yLmNhbGwoJ2dldFBhZ2UnLCdodHRwczovL2FwaS5kYXJrc2t5Lm5ldC9mb3JlY2FzdC83OTAyZDY4ZjBiNTY0OGNjZTdiOWIxMjEzOTQ1MTk3NC8nK2xvY2F0aW9uKycsJytjdXJyZW50VGltZSsnP3VuaXRzPXNpJyx7dGltZW91dDoxNTAwMH0sZnVuY3Rpb24oZXJyLGRhcmtTa3lEYXRhKXtcbiAgICBNZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHBzOi8vYXBpLmRhcmtza3kubmV0L2ZvcmVjYXN0Lzc5MDJkNjhmMGI1NjQ4Y2NlN2I5YjEyMTM5NDUxOTc0LycrbG9jYXRpb24rJz91bml0cz1zaScse3RpbWVvdXQ6MTUwMDB9LGZ1bmN0aW9uKGVycixkYXJrU2t5RGF0YUxhc3Qpe1xuXG4gICAgLy9NZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHA6Ly93d3cuc2Fwby5wdCcsZnVuY3Rpb24oZXJyLGRhcmtTa3lEYXRhKXtcbiAgICAgIHZhciBkYXJrU2t5UGFyc2VkRGF0YSA9IFtdO1xuICAgICAgdmFyIGRhcmtTa3lQYXJzZWRDdXJyZW50RGF0YSA9IHt9XG4gICAgICBpZihkYXJrU2t5RGF0YSAmJiBkYXJrU2t5RGF0YS5kYXRhICYmIGRhcmtTa3lEYXRhLmRhdGEuaG91cmx5ICYmIGRhcmtTa3lEYXRhLmRhdGEuaG91cmx5LmRhdGEpe1xuICAgICAgICBkYXJrU2t5RGF0YS5kYXRhLmhvdXJseS5kYXRhLmZvckVhY2goZGF0YT0+e1xuICAgICAgICAgIGRhcmtTa3lQYXJzZWREYXRhLnB1c2goe1xuICAgICAgICAgICAgdGVtcGVyYXR1cmU6ZGF0YS50ZW1wZXJhdHVyZSxcbiAgICAgICAgICAgIGh1bWlkaXR5OiBkYXRhLmh1bWlkaXR5KjEwMCxcbiAgICAgICAgICAgIGRhdGU6KG5ldyBEYXRlKGRhdGEudGltZSoxMDAwKSkuZ2V0VGltZSgpXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGlmKGRhcmtTa3lEYXRhTGFzdCAmJiAgZGFya1NreURhdGFMYXN0LmRhdGEgJiYgZGFya1NreURhdGFMYXN0LmRhdGEuY3VycmVudGx5KXtcbiAgICAgICAgZGFya1NreVBhcnNlZEN1cnJlbnREYXRhID0ge1xuICAgICAgICAgIGRhdGU6IChuZXcgRGF0ZShkYXJrU2t5RGF0YUxhc3QuZGF0YS5jdXJyZW50bHkudGltZSoxMDAwKSkuZ2V0VGltZSgpLFxuICAgICAgICAgIHRlbXBlcmF0dXJlOiBkYXJrU2t5RGF0YUxhc3QuZGF0YS5jdXJyZW50bHkudGVtcGVyYXR1cmUsXG4gICAgICAgICAgaHVtaWRpdHk6IGRhcmtTa3lEYXRhTGFzdC5kYXRhLmN1cnJlbnRseS5odW1pZGl0eSoxMDBcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZGFya1NreVBhcnNlZERhdGEuc29ydChmdW5jdGlvbihhLGIpIHtyZXR1cm4gKGEuZGF0ZSA+IGIuZGF0ZSkgPyAxIDogKChiLmRhdGUgPiBhLmRhdGUpID8gLTEgOiAwKTt9ICk7XG4gICAgICBjYWxsYmFjayh7XG4gICAgICAgIGhpc3RvcmljOiBkYXJrU2t5UGFyc2VkRGF0YSxcbiAgICAgICAgY3VycmVudDogZGFya1NreVBhcnNlZEN1cnJlbnREYXRhXG4gICAgICB9LHN0YXJ0RGF0ZSk7XG4gICAgfSk7XG4gIH0pO1xufVxuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBIVFRQIH0gZnJvbSAnbWV0ZW9yL2h0dHAnO1xuaW1wb3J0IHt3ZWF0aGVyU3RhdGlvbn0gZnJvbSAnLi93ZWF0aGVyU3RhdGlvbi5qcydcbmltcG9ydCB7YXBpeHV9IGZyb20gJy4vYXBpeHUuanMnXG5pbXBvcnQge2RhcmtTa3l9IGZyb20gJy4vZGFya1NreS5qcydcbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50J1xuZXhwb3J0IHtwb3N0RGF0YUxvYWRlcn1cblxuY29uc3QgY2FsbFNlcnZpY2UgPSAodHlwZSwgdXJsLCBvcHRpb25zKSA9PiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gIEhUVFAuY2FsbCh0eXBlLCB1cmwsIG9wdGlvbnMsIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgaWYgKGVycm9yKSB7XG4gICAgICByZWplY3QoZXJyb3IpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgfVxuICB9KTtcbn0pO1xuXG5mdW5jdGlvbiBnZXREaWZmVmVjdG9yKHdlYXRoZXJTdGF0aW9uRGF0YSxkYXRhVmVjdCl7XG4gIHZhciBpVGVtcCA9IDA7XG4gIHZhciBpSHVtaWRpdHkgPSAwO1xuICB2YXIgZGlmZlRlbXAgPSBbXTtcbiAgdmFyIGRpZmZIdW1pZGl0eSA9IFtdO1xuICB2YXIgZGlmZiA9IFtdXG4gIGlmKGRhdGFWZWN0Lmhpc3RvcmljKXtcbiAgICBkYXRhVmVjdC5oaXN0b3JpYy5mb3JFYWNoKHJlY29yZD0+e1xuICAgICAgdmFyIHN1bVRlbXBlcmF0dXJlID0gbnVsbDtcbiAgICAgIHZhciBzdW1IdW1pZGl0eSA9IG51bGw7XG4gICAgICB2YXIgblRlbXBlcmF0dXJlID0gMDtcbiAgICAgIHZhciBuSHVtaWRpdHkgPSAwO1xuICAgICAgdmFyIGFjdHVhbFRpbWUgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xuICAgICAgaWYocmVjb3JkLmRhdGU8YWN0dWFsVGltZSlcbiAgICAgIHtcbiAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljKXtcbiAgICAgICAgICBmb3IodmFyIGk9MDtpPHdlYXRoZXJTdGF0aW9uRGF0YS5oaXN0b3JpYy5sZW5ndGg7aSsrKVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHZhciBkZWx0YSA9IHJlY29yZC5kYXRlLXdlYXRoZXJTdGF0aW9uRGF0YS5oaXN0b3JpY1tpXS5kYXRlXG5cbiAgICAgICAgICAgIGlmKGRlbHRhPDM2MDAwMDApe1xuICAgICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGEuaGlzdG9yaWNbaV0udGVtcGVyYXR1cmUpXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdW1UZW1wZXJhdHVyZSA9IHN1bVRlbXBlcmF0dXJlICsgd2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljW2ldLnRlbXBlcmF0dXJlXG4gICAgICAgICAgICAgICAgblRlbXBlcmF0dXJlID0gblRlbXBlcmF0dXJlICsgMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGEuaGlzdG9yaWNbaV0uaHVtaWRpdHkpXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdW1IdW1pZGl0eSA9IHN1bUh1bWlkaXR5ICsgd2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljW2ldLmh1bWlkaXR5XG4gICAgICAgICAgICAgICAgbkh1bWlkaXR5ID0gbkh1bWlkaXR5ICsgMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfWVsc2UgaWYoZGVsdGEgPDApe1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYoc3VtVGVtcGVyYXR1cmUgJiYgc3VtSHVtaWRpdHkpXG4gICAgICAgICAge1xuXG4gICAgICAgICAgICBkaWZmLnB1c2goe1xuICAgICAgICAgICAgICBkYXRlOiByZWNvcmQuZGF0ZSxcbiAgICAgICAgICAgICAgdGVtcGVyYXR1cmU6IE1hdGguYWJzKHN1bVRlbXBlcmF0dXJlL25UZW1wZXJhdHVyZSAtIHJlY29yZC50ZW1wZXJhdHVyZSksXG4gICAgICAgICAgICAgIGh1bWlkaXR5OiBNYXRoLmFicyhzdW1IdW1pZGl0eS9uSHVtaWRpdHkgLSByZWNvcmQuaHVtaWRpdHkpXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICB9KVxuICB9XG4gIHJldHVybiBkaWZmXG59XG5cbmZ1bmN0aW9uIHBvc3REYXRhTG9hZGVyKHByb3BzLCBvbkRhdGEsZW52KSB7XG4gIHZhciBjb25maWcgPSBlbnYuY29uZmlnP2Vudi5jb25maWc6e31cbiAgdmFyIGRhdGUgPSBuZXcgRGF0ZShwcm9wcy5tYXRjaC5wYXJhbXMuZGF0ZSkuZ2V0VGltZSgpO1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIGQuc2V0SG91cnMoMCwwLDAsMCk7XG4gIHZhciBtaWRuaWdodCA9IGQuZ2V0VGltZSgpO1xuICB2YXIgc3RhcnREYXRlID0gZGF0ZT9kYXRlOm1pZG5pZ2h0O1xuXG4gIC8vIGxvYWQgZGF0YSBmcm9tIHRoZSBzZXJ2ZXIuICh1c2luZyBwcm9wcy5pZCB0byBpZGVudGlmeSB0aGUgcG9zdClcbiAgLy8gKEhlcmUnbGwgd2UnbGwgdXNlIHNldFRpbWVvdXQgZm9yIGRlbW9uc3RyYXRpb24gcHVycG9zZSlcbiAgd2VhdGhlclN0YXRpb24oZnVuY3Rpb24od2VhdGhlclN0YXRpb25EYXRhLHN0YXJ0RGF0ZSl7XG4gICAgYXBpeHUoZnVuY3Rpb24oYXBpeHVEYXRhLHN0YXJ0RGF0ZSl7XG4gICAgICBkYXJrU2t5KGZ1bmN0aW9uKGRhcmtTa3lEYXRhLHN0YXJ0RGF0ZSl7XG4gICAgICAgIGFwaXh1RGF0YS5kaWZmID0gZ2V0RGlmZlZlY3Rvcih3ZWF0aGVyU3RhdGlvbkRhdGEsYXBpeHVEYXRhKVxuICAgICAgICBkYXJrU2t5RGF0YS5kaWZmID0gZ2V0RGlmZlZlY3Rvcih3ZWF0aGVyU3RhdGlvbkRhdGEsZGFya1NreURhdGEpXG4gICAgICAgIG9uRGF0YShudWxsLCB7XG4gICAgICAgICAgd2VhdGhlclN0YXRpb246IHdlYXRoZXJTdGF0aW9uRGF0YSxcbiAgICAgICAgICBhcGl4dTogYXBpeHVEYXRhLFxuICAgICAgICAgIGRhcmtTa3k6IGRhcmtTa3lEYXRhLFxuICAgICAgICAgIHN0YXJ0RGF0ZTogbW9tZW50KHN0YXJ0RGF0ZSkuZm9ybWF0KCdZWVlZLU1NLUREJylcbiAgICAgICAgfSlcbiAgICAgIH0sc3RhcnREYXRlLGNvbmZpZyk7XG4gICAgfSxzdGFydERhdGUsY29uZmlnKTtcbiAgfSxzdGFydERhdGUsY29uZmlnKVxufVxuaWYoTWV0ZW9yLmlzU2VydmVyKXtcbiAgTWV0ZW9yLm1ldGhvZHMoe1xuICAgIGdldFBhZ2UodXJsLG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBjYWxsU2VydmljZShcbiAgICAgICAgJ0dFVCcsXG4gICAgICAgIHVybCxcbiAgICAgICAgb3B0aW9uc1xuICAgICAgKS50aGVuKChyZXN1bHQpID0+IHJlc3VsdCkuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJzUwMCcsIGAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gICAgICB9KTtcbiAgICB9LFxuICB9KTtcbn1cbiIsImV4cG9ydCB7d2VhdGhlclN0YXRpb259XG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCdcbmZ1bmN0aW9uIHdlYXRoZXJTdGF0aW9uKGNhbGxiYWNrLHN0YXJ0RGF0ZSxjb25maWcpe1xuICB2YXIgZWxhc3RpY3NlYXJjaFVybCA9IGNvbmZpZyAmJiBjb25maWcuZWxhc3RpY3NlYXJjaFVybD9jb25maWcuZWxhc3RpY3NlYXJjaFVybDpcIlwiXG4gIHZhciBlbGFzdGljc2VhcmNoU2VhcmNoUXVlcnkgPSBjb25maWcgJiYgY29uZmlnLmVsYXN0aWNzZWFyY2hTZWFyY2hRdWVyeT9jb25maWcuZWxhc3RpY3NlYXJjaFNlYXJjaFF1ZXJ5OlwiXCJcbiAgdmFyIGJyb2tlclVybCA9IGNvbmZpZyAmJiBjb25maWcuYnJva2VyVXJsP2NvbmZpZy5icm9rZXJVcmw6XCJcIlxuICB2YXIgZml3YXJlU2VydmljZVBhdGggPSBjb25maWcgJiYgY29uZmlnLmZpd2FyZVNlcnZpY2VQYXRoP2NvbmZpZy5maXdhcmVTZXJ2aWNlUGF0aDpcIlwiXG4gIHZhciBmaXdhcmVTZXJ2aWNlID0gY29uZmlnICYmIGNvbmZpZy5maXdhcmVTZXJ2aWNlP2NvbmZpZy5maXdhcmVTZXJ2aWNlOlwiXCJcblxuICB2YXIgZm9ybWF0ZWREYXRlID0gbW9tZW50KHN0YXJ0RGF0ZSkuZm9ybWF0KCdZWVlZLU1NLUREJylcbiAgTWV0ZW9yLmNhbGwoJ2dldFBhZ2UnLCBlbGFzdGljc2VhcmNoVXJsICsgJz9xPScrZWxhc3RpY3NlYXJjaFNlYXJjaFF1ZXJ5Kycmc29ydD10aW1lOmRlc2Mmc2l6ZT02MDAwJnE9dGltZTonK2Zvcm1hdGVkRGF0ZSx7dGltZW91dDoxNTAwMH0sZnVuY3Rpb24oZXJyLHdlYXRoZXJTdGF0aW9uRGF0YSl7XG4gICAgTWV0ZW9yLmNhbGwoJ2dldFBhZ2UnLGVsYXN0aWNzZWFyY2hVcmwgKyAnP3E9JytlbGFzdGljc2VhcmNoU2VhcmNoUXVlcnkrJyZzb3J0PXRpbWU6ZGVzYyZzaXplPTEnLHt0aW1lb3V0OjE1MDAwfSxmdW5jdGlvbihlcnIsd2VhdGhlclN0YXRpb25EYXRhTGFzdCl7XG4gICAgICBNZXRlb3IuY2FsbCgnZ2V0UGFnZScsYnJva2VyVXJsLHtcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgXCJGaXdhcmUtU2VydmljZVBhdGhcIjpmaXdhcmVTZXJ2aWNlUGF0aCxcbiAgICAgICAgICAgIFwiRml3YXJlLVNlcnZpY2VcIjpmaXdhcmVTZXJ2aWNlXG4gICAgICAgICAgfSxcbiAgICAgICAgICB0aW1lb3V0OiAxNTAwMFxuICAgICAgICB9LGZ1bmN0aW9uKGVycix3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50KXtcbiAgICAgICAgICB2YXIgV1NQYXJzZWREYXRhID0gW107XG4gICAgICAgICAgdmFyIFdTQ3VycmVudERhdGEgPSB7fVxuICAgICAgICAgIHZhciBkID0gbmV3IERhdGUoKTtcbiAgICAgICAgICBkLnNldEhvdXJzKDAsMCwwLDApO1xuICAgICAgICAgIHZhciBtaWRuaWdodCA9IGQuZ2V0VGltZSgpO1xuICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YSAmJiB3ZWF0aGVyU3RhdGlvbkRhdGEuZGF0YSAmJiB3ZWF0aGVyU3RhdGlvbkRhdGEuZGF0YS5oaXRzICYmIHdlYXRoZXJTdGF0aW9uRGF0YS5kYXRhLmhpdHMuaGl0cyAmJiB3ZWF0aGVyU3RhdGlvbkRhdGEuZGF0YS5oaXRzLmhpdHMubGVuZ3RoIClcbiAgICAgICAgICB7XG4gICAgICAgICAgICB3ZWF0aGVyU3RhdGlvbkRhdGEuZGF0YS5oaXRzLmhpdHMuZm9yRWFjaChoaXQ9PntcbiAgICAgICAgICAgICAgaWYoKG5ldyBEYXRlKGhpdC5fc291cmNlLnRpbWUpKS5nZXRUaW1lKCk+bWlkbmlnaHQtMzYwMDAwMCB8fCB0cnVlKXtcbiAgICAgICAgICAgICAgICBpZihoaXQuX3NvdXJjZSlcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBpZihoaXQuX3NvdXJjZS5hdHRyaWJ1dGU9PVwiVFBcIilcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgV1NQYXJzZWREYXRhLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgIGRhdGU6KG5ldyBEYXRlKGhpdC5fc291cmNlLnRpbWUpKS5nZXRUaW1lKCksXG4gICAgICAgICAgICAgICAgICAgICAgdGVtcGVyYXR1cmU6aGl0Ll9zb3VyY2UudmFsdWVcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmKGhpdC5fc291cmNlLmF0dHJpYnV0ZT09XCJIRFwiKVxuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBXU1BhcnNlZERhdGEucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgZGF0ZToobmV3IERhdGUoaGl0Ll9zb3VyY2UudGltZSkpLmdldFRpbWUoKSxcbiAgICAgICAgICAgICAgICAgICAgICBodW1pZGl0eTpoaXQuX3NvdXJjZS52YWx1ZVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgV1NQYXJzZWREYXRhLnNvcnQoZnVuY3Rpb24oYSxiKSB7cmV0dXJuIChhLmRhdGUgPiBiLmRhdGUpID8gMSA6ICgoYi5kYXRlID4gYS5kYXRlKSA/IC0xIDogMCk7fSApO1xuICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YUN1cnJlbnQgJiYgd2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhKVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHZhciB0ZW1wZXJhdHVyZSA9IG51bGw7XG4gICAgICAgICAgICBmb3IodmFyIGk9V1NQYXJzZWREYXRhLmxlbmd0aC0xO2k+MDtpLS0pXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGlmKFdTUGFyc2VkRGF0YVtpXS50ZW1wZXJhdHVyZSl7XG4gICAgICAgICAgICAgICAgdGVtcGVyYXR1cmUgPSBXU1BhcnNlZERhdGFbaV0udGVtcGVyYXR1cmVcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGh1bWlkaXR5ID0gbnVsbDtcbiAgICAgICAgICAgIGZvcih2YXIgaT1XU1BhcnNlZERhdGEubGVuZ3RoLTE7aT4wO2ktLSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgaWYoV1NQYXJzZWREYXRhW2ldLmh1bWlkaXR5KXtcbiAgICAgICAgICAgICAgICBodW1pZGl0eSA9IFdTUGFyc2VkRGF0YVtpXS5odW1pZGl0eVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50LmRhdGEuVFApe1xuICAgICAgICAgICAgICBXU0N1cnJlbnREYXRhLnRlbXBlcmF0dXJlID0gd2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhLlRQLnZhbHVlXG4gICAgICAgICAgICAgIC8vV1NDdXJyZW50RGF0YS50ZW1wZXJhdHVyZSA9IHRlbXBlcmF0dXJlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50LmRhdGEuSEQpe1xuICAgICAgICAgICAgICBXU0N1cnJlbnREYXRhLmh1bWlkaXR5ID0gd2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhLkhELnZhbHVlXG4gICAgICAgICAgICAgIC8vV1NDdXJyZW50RGF0YS5odW1pZGl0eSA9IGh1bWlkaXR5XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbGFzdERhdGUgPSBudWxsO1xuICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhTGFzdCAmJiB3ZWF0aGVyU3RhdGlvbkRhdGFMYXN0LmRhdGEgJiYgd2VhdGhlclN0YXRpb25EYXRhTGFzdC5kYXRhLmhpdHMgJiYgd2VhdGhlclN0YXRpb25EYXRhTGFzdC5kYXRhLmhpdHMuaGl0cyAmJiB3ZWF0aGVyU3RhdGlvbkRhdGFMYXN0LmRhdGEuaGl0cy5oaXRzLmxlbmd0aCl7XG4gICAgICAgICAgICAgIGxhc3REYXRlID0gd2VhdGhlclN0YXRpb25EYXRhTGFzdC5kYXRhLmhpdHMuaGl0c1swXS5zb3J0WzBdXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZihXU1BhcnNlZERhdGEubGVuZ3RoKXtcbiAgICAgICAgICAgICAgV1NDdXJyZW50RGF0YS5kYXRlID0gbGFzdERhdGVcbiAgICAgICAgICAgICAgLy9XU0N1cnJlbnREYXRhLmRhdGUgPSBXU1BhcnNlZERhdGFbV1NQYXJzZWREYXRhLmxlbmd0aC0xXS5kYXRlXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICB9XG4gICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgaGlzdG9yaWM6IFdTUGFyc2VkRGF0YSxcbiAgICAgICAgICAgIGN1cnJlbnQ6IFdTQ3VycmVudERhdGFcbiAgICAgICAgICB9LHN0YXJ0RGF0ZSk7XG4gICAgICB9KVxuICAgIH0pO1xuICB9KVxufVxuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgJy4uL2ltcG9ydHMvYXBpL2RhdGEuanMnXG5NZXRlb3Iuc3RhcnR1cCgoKSA9PiB7XG4gIC8vIGNvZGUgdG8gcnVuIG9uIHNlcnZlciBhdCBzdGFydHVwXG5cbn0pO1xuIl19
