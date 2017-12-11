var require = meteorInstall({"imports":{"api":{"apixu.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// imports/api/apixu.js                                                                                       //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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

function apixu(callback, startDate) {
  var formatedDate = moment(startDate).format('YYYY-MM-DD');
  Meteor.call('getPage', 'http://api.apixu.com/v1/history.json?key=05d72599bed946d8983155015170512&q=Caparica&dt=' + formatedDate, function (err, apixuData) {
    Meteor.call('getPage', 'http://api.apixu.com/v1/current.json?key=05d72599bed946d8983155015170512&q=Caparica', function (err, apixuDataCurrent) {
      var apixuParsedData = [];
      var apixuParsedCurrentData = {};

      if (apixuData) {
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
      }

      if (apixuDataCurrent) {
        if (apixuDataCurrent.data) {
          if (apixuDataCurrent.data.current) {
            apixuParsedCurrentData = {
              date: new Date(apixuDataCurrent.data.current.last_updated_epoch * 1000).getTime(),
              temperature: apixuDataCurrent.data.current.temp_c,
              humidity: apixuDataCurrent.data.current.humidity
            };
          }
        }
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
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"darkSky.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// imports/api/darkSky.js                                                                                     //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
module.export({
  darkSky: () => darkSky
});

function darkSky(callback, startDate) {
  var currentTime = Math.round(new Date(startDate).getTime() / 1000);
  Meteor.call('getPage', 'https://api.darksky.net/forecast/7902d68f0b5648cce7b9b12139451974/38.67,-9.2,' + currentTime + '?units=si', function (err, darkSkyData) {
    //Meteor.call('getPage','https://api.darksky.net/forecast/7902d68f0b5648cce7b9b12139451974/38.67,-9.2?units=si',function(err,darkSkyDataLast){
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

    if (darkSkyData) {
      if (darkSkyData.data) {
        if (darkSkyData.data.currently) {
          darkSkyParsedCurrentData = {
            date: new Date(darkSkyData.data.currently.time * 1000).getTime(),
            temperature: darkSkyData.data.currently.temperature,
            humidity: darkSkyData.data.currently.humidity * 100
          };
        }
      }
    }

    darkSkyParsedData.sort(function (a, b) {
      return a.date > b.date ? 1 : b.date > a.date ? -1 : 0;
    });
    callback({
      historic: darkSkyParsedData,
      current: darkSkyParsedCurrentData
    }, startDate); //});
  });
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"data.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// imports/api/data.js                                                                                        //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
      }, startDate);
    }, startDate);
  }, startDate);
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
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"weatherStation.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// imports/api/weatherStation.js                                                                              //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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

function weatherStation(callback, startDate) {
  var formatedDate = moment(startDate).format('YYYY-MM-DD');
  Meteor.call('getPage', 'http://elasticsearch.waziup.io/waziup-ui-weather/_search?q=name:WeatherStationUI&sort=time:desc&size=6000&q=time:' + formatedDate, function (err, weatherStationData) {
    //Meteor.call('getPage','http://elasticsearch.waziup.io/waziup-ui-weather/_search?q=name:WeatherStationUI&sort=time:desc&size=1',function(err,weatherStationDataLast){
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
          }
        }
      }

      WSParsedData.sort(function (a, b) {
        return a.date > b.date ? 1 : b.date > a.date ? -1 : 0;
      });

      if (weatherStationDataCurrent.data) {
        if (weatherStationDataCurrent.data) {
          console.log(WSParsedData[WSParsedData.length - 1]);
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
            //WSCurrentData.temperature = weatherStationDataCurrent.data.TP.value
            WSCurrentData.temperature = temperature;
          }

          if (weatherStationDataCurrent.data.HD) {
            //WSCurrentData.humidity = weatherStationDataCurrent.data.HD.value
            WSCurrentData.humidity = humidity;
          }

          var lastDate = null; /*if(weatherStationDataLast){
                                 if(weatherStationDataLast.data){
                                   if(weatherStationDataLast.data.hits){
                                     if(weatherStationDataLast.data.hits.hits){
                                       if(weatherStationDataLast.data.hits.hits.length){
                                         lastDate = weatherStationDataLast.data.hits.hits[0].sort[0]
                                       }
                                     }
                                   }
                                 }
                               }*/

          if (WSParsedData.length) {
            WSCurrentData.date = WSParsedData[WSParsedData.length - 1].date;
          }
        }
      }

      callback({
        historic: WSParsedData,
        current: WSCurrentData
      }, startDate);
    }); //});
  });
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"server":{"main.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// server/main.js                                                                                             //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json",
    ".jsx"
  ]
});
require("./server/main.js");
//# sourceURL=meteor://💻app/app/app.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvYXBpeHUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2RhcmtTa3kuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2RhdGEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL3dlYXRoZXJTdGF0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9zZXJ2ZXIvbWFpbi5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJhcGl4dSIsIm1vbWVudCIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwiY2FsbGJhY2siLCJzdGFydERhdGUiLCJmb3JtYXRlZERhdGUiLCJmb3JtYXQiLCJNZXRlb3IiLCJjYWxsIiwiZXJyIiwiYXBpeHVEYXRhIiwiYXBpeHVEYXRhQ3VycmVudCIsImFwaXh1UGFyc2VkRGF0YSIsImFwaXh1UGFyc2VkQ3VycmVudERhdGEiLCJkYXRhIiwiZm9yZWNhc3QiLCJmb3JlY2FzdGRheSIsImhvdXIiLCJmb3JFYWNoIiwicHVzaCIsInRlbXBlcmF0dXJlIiwidGVtcF9jIiwiaHVtaWRpdHkiLCJkYXRlIiwiRGF0ZSIsInRpbWVfZXBvY2giLCJnZXRUaW1lIiwiY3VycmVudCIsImxhc3RfdXBkYXRlZF9lcG9jaCIsInNvcnQiLCJhIiwiYiIsImhpc3RvcmljIiwiZGFya1NreSIsImN1cnJlbnRUaW1lIiwiTWF0aCIsInJvdW5kIiwiZGFya1NreURhdGEiLCJkYXJrU2t5UGFyc2VkRGF0YSIsImRhcmtTa3lQYXJzZWRDdXJyZW50RGF0YSIsImhvdXJseSIsInRpbWUiLCJjdXJyZW50bHkiLCJwb3N0RGF0YUxvYWRlciIsIkhUVFAiLCJ3ZWF0aGVyU3RhdGlvbiIsImNhbGxTZXJ2aWNlIiwidHlwZSIsInVybCIsIm9wdGlvbnMiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImVycm9yIiwicmVzdWx0IiwiZ2V0RGlmZlZlY3RvciIsIndlYXRoZXJTdGF0aW9uRGF0YSIsImRhdGFWZWN0IiwiaVRlbXAiLCJpSHVtaWRpdHkiLCJkaWZmVGVtcCIsImRpZmZIdW1pZGl0eSIsImRpZmYiLCJyZWNvcmQiLCJzdW1UZW1wZXJhdHVyZSIsInN1bUh1bWlkaXR5IiwiblRlbXBlcmF0dXJlIiwibkh1bWlkaXR5IiwiYWN0dWFsVGltZSIsImkiLCJsZW5ndGgiLCJkZWx0YSIsImFicyIsInByb3BzIiwib25EYXRhIiwiZSIsIm1hdGNoIiwicGFyYW1zIiwiZCIsInNldEhvdXJzIiwibWlkbmlnaHQiLCJpc1NlcnZlciIsIm1ldGhvZHMiLCJnZXRQYWdlIiwidGhlbiIsImNhdGNoIiwiRXJyb3IiLCJtZXNzYWdlIiwiaGVhZGVycyIsIndlYXRoZXJTdGF0aW9uRGF0YUN1cnJlbnQiLCJXU1BhcnNlZERhdGEiLCJXU0N1cnJlbnREYXRhIiwiaGl0cyIsImhpdCIsIl9zb3VyY2UiLCJhdHRyaWJ1dGUiLCJ2YWx1ZSIsImNvbnNvbGUiLCJsb2ciLCJUUCIsIkhEIiwibGFzdERhdGUiLCJzdGFydHVwIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBQSxPQUFPQyxNQUFQLENBQWM7QUFBQ0MsU0FBTSxNQUFJQTtBQUFYLENBQWQ7QUFBaUMsSUFBSUMsTUFBSjtBQUFXSCxPQUFPSSxLQUFQLENBQWFDLFFBQVEsUUFBUixDQUFiLEVBQStCO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDSixhQUFPSSxDQUFQO0FBQVM7O0FBQXJCLENBQS9CLEVBQXNELENBQXREOztBQUU1QyxTQUFTTCxLQUFULENBQWVNLFFBQWYsRUFBd0JDLFNBQXhCLEVBQWtDO0FBQ2hDLE1BQUlDLGVBQWVQLE9BQU9NLFNBQVAsRUFBa0JFLE1BQWxCLENBQXlCLFlBQXpCLENBQW5CO0FBQ0FDLFNBQU9DLElBQVAsQ0FBWSxTQUFaLEVBQXNCLDRGQUEwRkgsWUFBaEgsRUFBNkgsVUFBU0ksR0FBVCxFQUFhQyxTQUFiLEVBQXVCO0FBQ2xKSCxXQUFPQyxJQUFQLENBQVksU0FBWixFQUFz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QkFBVTBELFlBREg7QUFFUC9ELGlCQUFTZ0U7QUFGRixPQUFULEVBR0V2RixTQUhGO0FBSUgsS0E5RkQsRUFIbUwsQ0FrR3JMO0FBQ0QsR0FuR0Q7QUFvR0QsQzs7Ozs7Ozs7Ozs7QUN4R0QsSUFBSUcsTUFBSjtBQUFXWixPQUFPSSxLQUFQLENBQWFDLFFBQVEsZUFBUixDQUFiLEVBQXNDO0FBQUNPLFNBQU9MLENBQVAsRUFBUztBQUFDSyxhQUFPTCxDQUFQO0FBQVM7O0FBQXBCLENBQXRDLEVBQTRELENBQTVEO0FBQStEUCxPQUFPSSxLQUFQLENBQWFDLFFBQVEsd0JBQVIsQ0FBYjtBQUUxRU8sT0FBTytGLE9BQVAsQ0FBZSxNQUFNLENBQ25CO0FBQ0QsQ0FGRCxFIiwiZmlsZSI6Ii9hcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQge2FwaXh1fVxuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnXG5mdW5jdGlvbiBhcGl4dShjYWxsYmFjayxzdGFydERhdGUpe1xuICB2YXIgZm9ybWF0ZWREYXRlID0gbW9tZW50KHN0YXJ0RGF0ZSkuZm9ybWF0KCdZWVlZLU1NLUREJylcbiAgTWV0ZW9yLmNhbGwoJ2dldFBhZ2UnLCdodHRwOi8vYXBpLmFwaXh1LmNvbS92MS9oaXN0b3J5Lmpzb24/a2V5PTA1ZDcyNTk5YmVkOTQ2ZDg5ODMxNTUwMTUxNzA1MTImcT1DYXBhcmljYSZkdD0nK2Zvcm1hdGVkRGF0ZSxmdW5jdGlvbihlcnIsYXBpeHVEYXRhKXtcbiAgICBNZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHA6Ly9hcGkuYXBpeHUuY29tL3YxL2N1cnJlbnQuanNvbj9rZXk9MDVkNzI1OTliZWQ5NDZkODk4MzE1NTAxNTE3MDUxMiZxPUNhcGFyaWNhJyxmdW5jdGlvbihlcnIsYXBpeHVEYXRhQ3VycmVudCl7XG4gICAgICB2YXIgYXBpeHVQYXJzZWREYXRhID0gW107XG4gICAgICB2YXIgYXBpeHVQYXJzZWRDdXJyZW50RGF0YSA9IHt9O1xuICAgICAgaWYoYXBpeHVEYXRhKXtcbiAgICAgICAgaWYoYXBpeHVEYXRhLmRhdGEpXG4gICAgICAgIHtcbiAgICAgICAgICBpZihhcGl4dURhdGEuZGF0YS5mb3JlY2FzdCl7XG4gICAgICAgICAgICBpZihhcGl4dURhdGEuZGF0YS5mb3JlY2FzdC5mb3JlY2FzdGRheSl7XG4gICAgICAgICAgICAgIGlmKGFwaXh1RGF0YS5kYXRhLmZvcmVjYXN0LmZvcmVjYXN0ZGF5WzBdKXtcbiAgICAgICAgICAgICAgICBpZihhcGl4dURhdGEuZGF0YS5mb3JlY2FzdC5mb3JlY2FzdGRheVswXS5ob3VyKXtcbiAgICAgICAgICAgICAgICAgIGFwaXh1RGF0YS5kYXRhLmZvcmVjYXN0LmZvcmVjYXN0ZGF5WzBdLmhvdXIuZm9yRWFjaChob3VyPT57XG4gICAgICAgICAgICAgICAgICAgIGFwaXh1UGFyc2VkRGF0YS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICB0ZW1wZXJhdHVyZTpob3VyLnRlbXBfYyxcbiAgICAgICAgICAgICAgICAgICAgICBodW1pZGl0eTogaG91ci5odW1pZGl0eSxcbiAgICAgICAgICAgICAgICAgICAgICBkYXRlOihuZXcgRGF0ZShob3VyLnRpbWVfZXBvY2gqMTAwMCkpLmdldFRpbWUoKVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYoYXBpeHVEYXRhQ3VycmVudCl7XG4gICAgICAgIGlmKGFwaXh1RGF0YUN1cnJlbnQuZGF0YSlcbiAgICAgICAge1xuICAgICAgICAgIGlmKGFwaXh1RGF0YUN1cnJlbnQuZGF0YS5jdXJyZW50KXtcbiAgICAgICAgICAgIGFwaXh1UGFyc2VkQ3VycmVudERhdGEgPSB7XG4gICAgICAgICAgICAgIGRhdGU6IChuZXcgRGF0ZShhcGl4dURhdGFDdXJyZW50LmRhdGEuY3VycmVudC5sYXN0X3VwZGF0ZWRfZXBvY2gqMTAwMCkpLmdldFRpbWUoKSxcbiAgICAgICAgICAgICAgdGVtcGVyYXR1cmU6IGFwaXh1RGF0YUN1cnJlbnQuZGF0YS5jdXJyZW50LnRlbXBfYyxcbiAgICAgICAgICAgICAgaHVtaWRpdHk6IGFwaXh1RGF0YUN1cnJlbnQuZGF0YS5jdXJyZW50Lmh1bWlkaXR5XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBhcGl4dVBhcnNlZERhdGEuc29ydChmdW5jdGlvbihhLGIpIHtyZXR1cm4gKGEuZGF0ZSA+IGIuZGF0ZSkgPyAxIDogKChiLmRhdGUgPiBhLmRhdGUpID8gLTEgOiAwKTt9ICk7XG4gICAgICBjYWxsYmFjayh7XG4gICAgICAgIGhpc3RvcmljOiBhcGl4dVBhcnNlZERhdGEsXG4gICAgICAgIGN1cnJlbnQ6IGFwaXh1UGFyc2VkQ3VycmVudERhdGFcbiAgICAgIH0sc3RhcnREYXRlKTtcbiAgICB9KTtcbiAgfSk7XG59XG4iLCJleHBvcnQge2RhcmtTa3l9XG5cbmZ1bmN0aW9uIGRhcmtTa3koY2FsbGJhY2ssc3RhcnREYXRlKXtcblxuICB2YXIgY3VycmVudFRpbWUgPSBNYXRoLnJvdW5kKChuZXcgRGF0ZShzdGFydERhdGUpKS5nZXRUaW1lKCkvMTAwMClcbiAgTWV0ZW9yLmNhbGwoJ2dldFBhZ2UnLCdodHRwczovL2FwaS5kYXJrc2t5Lm5ldC9mb3JlY2FzdC83OTAyZDY4ZjBiNTY0OGNjZTdiOWIxMjEzOTQ1MTk3NC8zOC42NywtOS4yLCcrY3VycmVudFRpbWUrJz91bml0cz1zaScsZnVuY3Rpb24oZXJyLGRhcmtTa3lEYXRhKXtcbiAgICAvL01ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cHM6Ly9hcGkuZGFya3NreS5uZXQvZm9yZWNhc3QvNzkwMmQ2OGYwYjU2NDhjY2U3YjliMTIxMzk0NTE5NzQvMzguNjcsLTkuMj91bml0cz1zaScsZnVuY3Rpb24oZXJyLGRhcmtTa3lEYXRhTGFzdCl7XG5cbiAgICAvL01ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cDovL3d3dy5zYXBvLnB0JyxmdW5jdGlvbihlcnIsZGFya1NreURhdGEpe1xuICAgICAgdmFyIGRhcmtTa3lQYXJzZWREYXRhID0gW107XG4gICAgICB2YXIgZGFya1NreVBhcnNlZEN1cnJlbnREYXRhID0ge31cbiAgICAgIGlmKGRhcmtTa3lEYXRhKXtcbiAgICAgICAgaWYoZGFya1NreURhdGEuZGF0YSl7XG4gICAgICAgICAgaWYoZGFya1NreURhdGEuZGF0YS5ob3VybHkpe1xuICAgICAgICAgICAgaWYoZGFya1NreURhdGEuZGF0YS5ob3VybHkuZGF0YSl7XG4gICAgICAgICAgICAgIGRhcmtTa3lEYXRhLmRhdGEuaG91cmx5LmRhdGEuZm9yRWFjaChkYXRhPT57XG4gICAgICAgICAgICAgICAgZGFya1NreVBhcnNlZERhdGEucHVzaCh7XG4gICAgICAgICAgICAgICAgICB0ZW1wZXJhdHVyZTpkYXRhLnRlbXBlcmF0dXJlLFxuICAgICAgICAgICAgICAgICAgaHVtaWRpdHk6IGRhdGEuaHVtaWRpdHkqMTAwLFxuICAgICAgICAgICAgICAgICAgZGF0ZToobmV3IERhdGUoZGF0YS50aW1lKjEwMDApKS5nZXRUaW1lKClcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYoZGFya1NreURhdGEpe1xuICAgICAgICBpZihkYXJrU2t5RGF0YS5kYXRhKVxuICAgICAgICB7XG4gICAgICAgICAgaWYoZGFya1NreURhdGEuZGF0YS5jdXJyZW50bHkpXG4gICAgICAgICAge1xuICAgICAgICAgICAgZGFya1NreVBhcnNlZEN1cnJlbnREYXRhID0ge1xuICAgICAgICAgICAgICBkYXRlOiAobmV3IERhdGUoZGFya1NreURhdGEuZGF0YS5jdXJyZW50bHkudGltZSoxMDAwKSkuZ2V0VGltZSgpLFxuICAgICAgICAgICAgICB0ZW1wZXJhdHVyZTogZGFya1NreURhdGEuZGF0YS5jdXJyZW50bHkudGVtcGVyYXR1cmUsXG4gICAgICAgICAgICAgIGh1bWlkaXR5OiBkYXJrU2t5RGF0YS5kYXRhLmN1cnJlbnRseS5odW1pZGl0eSoxMDBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGRhcmtTa3lQYXJzZWREYXRhLnNvcnQoZnVuY3Rpb24oYSxiKSB7cmV0dXJuIChhLmRhdGUgPiBiLmRhdGUpID8gMSA6ICgoYi5kYXRlID4gYS5kYXRlKSA/IC0xIDogMCk7fSApO1xuICAgICAgY2FsbGJhY2soe1xuICAgICAgICBoaXN0b3JpYzogZGFya1NreVBhcnNlZERhdGEsXG4gICAgICAgIGN1cnJlbnQ6IGRhcmtTa3lQYXJzZWRDdXJyZW50RGF0YVxuICAgICAgfSxzdGFydERhdGUpO1xuICAgIC8vfSk7XG4gIH0pO1xufVxuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBIVFRQIH0gZnJvbSAnbWV0ZW9yL2h0dHAnO1xuaW1wb3J0IHt3ZWF0aGVyU3RhdGlvbn0gZnJvbSAnLi93ZWF0aGVyU3RhdGlvbi5qcydcbmltcG9ydCB7YXBpeHV9IGZyb20gJy4vYXBpeHUuanMnXG5pbXBvcnQge2RhcmtTa3l9IGZyb20gJy4vZGFya1NreS5qcydcbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50J1xuZXhwb3J0IHtwb3N0RGF0YUxvYWRlcn1cblxuY29uc3QgY2FsbFNlcnZpY2UgPSAodHlwZSwgdXJsLCBvcHRpb25zKSA9PiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gIEhUVFAuY2FsbCh0eXBlLCB1cmwsIG9wdGlvbnMsIChlcnJvciwgcmVzdWx0KSA9PiB7XG4gICAgaWYgKGVycm9yKSB7XG4gICAgICByZWplY3QoZXJyb3IpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXNvbHZlKHJlc3VsdCk7XG4gICAgfVxuICB9KTtcbn0pO1xuXG5mdW5jdGlvbiBnZXREaWZmVmVjdG9yKHdlYXRoZXJTdGF0aW9uRGF0YSxkYXRhVmVjdCl7XG4gIHZhciBpVGVtcCA9IDA7XG4gIHZhciBpSHVtaWRpdHkgPSAwO1xuICB2YXIgZGlmZlRlbXAgPSBbXTtcbiAgdmFyIGRpZmZIdW1pZGl0eSA9IFtdO1xuICB2YXIgZGlmZiA9IFtdXG4gIGlmKGRhdGFWZWN0Lmhpc3RvcmljKXtcbiAgICBkYXRhVmVjdC5oaXN0b3JpYy5mb3JFYWNoKHJlY29yZD0+e1xuICAgICAgdmFyIHN1bVRlbXBlcmF0dXJlID0gbnVsbDtcbiAgICAgIHZhciBzdW1IdW1pZGl0eSA9IG51bGw7XG4gICAgICB2YXIgblRlbXBlcmF0dXJlID0gMDtcbiAgICAgIHZhciBuSHVtaWRpdHkgPSAwO1xuICAgICAgdmFyIGFjdHVhbFRpbWUgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpO1xuICAgICAgaWYocmVjb3JkLmRhdGU8YWN0dWFsVGltZSlcbiAgICAgIHtcbiAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljKXtcbiAgICAgICAgICBmb3IodmFyIGk9MDtpPHdlYXRoZXJTdGF0aW9uRGF0YS5oaXN0b3JpYy5sZW5ndGg7aSsrKVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHZhciBkZWx0YSA9IHJlY29yZC5kYXRlLXdlYXRoZXJTdGF0aW9uRGF0YS5oaXN0b3JpY1tpXS5kYXRlXG4gICAgICAgICAgICBpZihkZWx0YTwzNjAwMDAwICYmIGRlbHRhPjApe1xuICAgICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGEuaGlzdG9yaWNbaV0udGVtcGVyYXR1cmUpXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdW1UZW1wZXJhdHVyZSA9IHN1bVRlbXBlcmF0dXJlICsgd2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljW2ldLnRlbXBlcmF0dXJlXG4gICAgICAgICAgICAgICAgblRlbXBlcmF0dXJlID0gblRlbXBlcmF0dXJlICsgMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGEuaGlzdG9yaWNbaV0uaHVtaWRpdHkpXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdW1IdW1pZGl0eSA9IHN1bUh1bWlkaXR5ICsgd2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljW2ldLmh1bWlkaXR5XG4gICAgICAgICAgICAgICAgbkh1bWlkaXR5ID0gbkh1bWlkaXR5ICsgMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfWVsc2UgaWYoZGVsdGEgPDApe1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYoc3VtVGVtcGVyYXR1cmUgJiYgc3VtSHVtaWRpdHkpXG4gICAgICAgICAge1xuICAgICAgICAgICAgZGlmZi5wdXNoKHtcbiAgICAgICAgICAgICAgZGF0ZTogcmVjb3JkLmRhdGUsXG4gICAgICAgICAgICAgIHRlbXBlcmF0dXJlOiBNYXRoLmFicyhzdW1UZW1wZXJhdHVyZS9uVGVtcGVyYXR1cmUgLSByZWNvcmQudGVtcGVyYXR1cmUpLFxuICAgICAgICAgICAgICBodW1pZGl0eTogTWF0aC5hYnMoc3VtSHVtaWRpdHkvbkh1bWlkaXR5IC0gcmVjb3JkLmh1bWlkaXR5KVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgfSlcbiAgfVxuICByZXR1cm4gZGlmZlxufVxuXG5mdW5jdGlvbiBwb3N0RGF0YUxvYWRlcihwcm9wcywgb25EYXRhLGUpIHtcblxuICB2YXIgZGF0ZSA9IG5ldyBEYXRlKHByb3BzLm1hdGNoLnBhcmFtcy5kYXRlKS5nZXRUaW1lKCk7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgZC5zZXRIb3VycygwLDAsMCwwKTtcbiAgdmFyIG1pZG5pZ2h0ID0gZC5nZXRUaW1lKCk7XG4gIHZhciBzdGFydERhdGUgPSBkYXRlP2RhdGU6bWlkbmlnaHQ7XG5cbiAgLy8gbG9hZCBkYXRhIGZyb20gdGhlIHNlcnZlci4gKHVzaW5nIHByb3BzLmlkIHRvIGlkZW50aWZ5IHRoZSBwb3N0KVxuICAvLyAoSGVyZSdsbCB3ZSdsbCB1c2Ugc2V0VGltZW91dCBmb3IgZGVtb25zdHJhdGlvbiBwdXJwb3NlKVxuICB3ZWF0aGVyU3RhdGlvbihmdW5jdGlvbih3ZWF0aGVyU3RhdGlvbkRhdGEsc3RhcnREYXRlKXtcbiAgICBhcGl4dShmdW5jdGlvbihhcGl4dURhdGEsc3RhcnREYXRlKXtcbiAgICAgIGRhcmtTa3koZnVuY3Rpb24oZGFya1NreURhdGEsc3RhcnREYXRlKXtcbiAgICAgICAgYXBpeHVEYXRhLmRpZmYgPSBnZXREaWZmVmVjdG9yKHdlYXRoZXJTdGF0aW9uRGF0YSxhcGl4dURhdGEpXG4gICAgICAgIGRhcmtTa3lEYXRhLmRpZmYgPSBnZXREaWZmVmVjdG9yKHdlYXRoZXJTdGF0aW9uRGF0YSxkYXJrU2t5RGF0YSlcbiAgICAgICAgb25EYXRhKG51bGwsIHtcbiAgICAgICAgICB3ZWF0aGVyU3RhdGlvbjogd2VhdGhlclN0YXRpb25EYXRhLFxuICAgICAgICAgIGFwaXh1OiBhcGl4dURhdGEsXG4gICAgICAgICAgZGFya1NreTogZGFya1NreURhdGEsXG4gICAgICAgICAgc3RhcnREYXRlOiBtb21lbnQoc3RhcnREYXRlKS5mb3JtYXQoJ1lZWVktTU0tREQnKVxuICAgICAgICB9KVxuICAgICAgfSxzdGFydERhdGUpO1xuICAgIH0sc3RhcnREYXRlKTtcbiAgfSxzdGFydERhdGUpXG59XG5pZihNZXRlb3IuaXNTZXJ2ZXIpe1xuICBNZXRlb3IubWV0aG9kcyh7XG4gICAgZ2V0UGFnZSh1cmwsb3B0aW9ucykge1xuICAgICAgcmV0dXJuIGNhbGxTZXJ2aWNlKFxuICAgICAgICAnR0VUJyxcbiAgICAgICAgdXJsLFxuICAgICAgICBvcHRpb25zXG4gICAgICApLnRoZW4oKHJlc3VsdCkgPT4gcmVzdWx0KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcignNTAwJywgYCR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gIH0pO1xufVxuIiwiZXhwb3J0IHt3ZWF0aGVyU3RhdGlvbn1cbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50J1xuZnVuY3Rpb24gd2VhdGhlclN0YXRpb24oY2FsbGJhY2ssc3RhcnREYXRlKXtcbiAgdmFyIGZvcm1hdGVkRGF0ZSA9IG1vbWVudChzdGFydERhdGUpLmZvcm1hdCgnWVlZWS1NTS1ERCcpXG4gIE1ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cDovL2VsYXN0aWNzZWFyY2gud2F6aXVwLmlvL3dheml1cC11aS13ZWF0aGVyL19zZWFyY2g/cT1uYW1lOldlYXRoZXJTdGF0aW9uVUkmc29ydD10aW1lOmRlc2Mmc2l6ZT02MDAwJnE9dGltZTonK2Zvcm1hdGVkRGF0ZSxmdW5jdGlvbihlcnIsd2VhdGhlclN0YXRpb25EYXRhKXtcbiAgICAvL01ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cDovL2VsYXN0aWNzZWFyY2gud2F6aXVwLmlvL3dheml1cC11aS13ZWF0aGVyL19zZWFyY2g/cT1uYW1lOldlYXRoZXJTdGF0aW9uVUkmc29ydD10aW1lOmRlc2Mmc2l6ZT0xJyxmdW5jdGlvbihlcnIsd2VhdGhlclN0YXRpb25EYXRhTGFzdCl7XG5cbiAgICAgIE1ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cDovL2Jyb2tlci53YXppdXAuaW8vdjIvZW50aXRpZXMvV2VhdGhlclN0YXRpb25VSScse1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICBcIkZpd2FyZS1TZXJ2aWNlUGF0aFwiOlwiL1VJL1dFQVRIRVJcIixcbiAgICAgICAgICAgIFwiRml3YXJlLVNlcnZpY2VcIjpcIndheml1cFwiXG4gICAgICAgICAgfVxuICAgICAgICB9LGZ1bmN0aW9uKGVycix3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50KXtcbiAgICAgICAgICB2YXIgV1NQYXJzZWREYXRhID0gW107XG4gICAgICAgICAgdmFyIFdTQ3VycmVudERhdGEgPSB7fVxuICAgICAgICAgIHZhciBkID0gbmV3IERhdGUoKTtcbiAgICAgICAgICBkLnNldEhvdXJzKDAsMCwwLDApO1xuICAgICAgICAgIHZhciBtaWRuaWdodCA9IGQuZ2V0VGltZSgpO1xuICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YS5kYXRhKVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YS5kYXRhLmhpdHMpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YS5kYXRhLmhpdHMuaGl0cylcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YS5kYXRhLmhpdHMuaGl0cy5sZW5ndGgpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgd2VhdGhlclN0YXRpb25EYXRhLmRhdGEuaGl0cy5oaXRzLmZvckVhY2goaGl0PT57XG4gICAgICAgICAgICAgICAgICAgIGlmKChuZXcgRGF0ZShoaXQuX3NvdXJjZS50aW1lKSkuZ2V0VGltZSgpPm1pZG5pZ2h0LTM2MDAwMDAgfHwgdHJ1ZSl7XG4gICAgICAgICAgICAgICAgICAgICAgaWYoaGl0Ll9zb3VyY2UpXG4gICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaGl0Ll9zb3VyY2UuYXR0cmlidXRlPT1cIlRQXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIFdTUGFyc2VkRGF0YS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRlOihuZXcgRGF0ZShoaXQuX3NvdXJjZS50aW1lKSkuZ2V0VGltZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBlcmF0dXJlOmhpdC5fc291cmNlLnZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZihoaXQuX3NvdXJjZS5hdHRyaWJ1dGU9PVwiSERcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgV1NQYXJzZWREYXRhLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGU6KG5ldyBEYXRlKGhpdC5fc291cmNlLnRpbWUpKS5nZXRUaW1lKCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaHVtaWRpdHk6aGl0Ll9zb3VyY2UudmFsdWVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIFdTUGFyc2VkRGF0YS5zb3J0KGZ1bmN0aW9uKGEsYikge3JldHVybiAoYS5kYXRlID4gYi5kYXRlKSA/IDEgOiAoKGIuZGF0ZSA+IGEuZGF0ZSkgPyAtMSA6IDApO30gKTtcbiAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50LmRhdGEpXG4gICAgICAgICAge1xuICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhKXtcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coV1NQYXJzZWREYXRhW1dTUGFyc2VkRGF0YS5sZW5ndGgtMV0pXG4gICAgICAgICAgICAgIHZhciB0ZW1wZXJhdHVyZSA9IG51bGw7XG4gICAgICAgICAgICAgIGZvcih2YXIgaT1XU1BhcnNlZERhdGEubGVuZ3RoLTE7aT4wO2ktLSlcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlmKFdTUGFyc2VkRGF0YVtpXS50ZW1wZXJhdHVyZSl7XG4gICAgICAgICAgICAgICAgICB0ZW1wZXJhdHVyZSA9IFdTUGFyc2VkRGF0YVtpXS50ZW1wZXJhdHVyZVxuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHZhciBodW1pZGl0eSA9IG51bGw7XG4gICAgICAgICAgICAgIGZvcih2YXIgaT1XU1BhcnNlZERhdGEubGVuZ3RoLTE7aT4wO2ktLSlcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlmKFdTUGFyc2VkRGF0YVtpXS5odW1pZGl0eSl7XG4gICAgICAgICAgICAgICAgICBodW1pZGl0eSA9IFdTUGFyc2VkRGF0YVtpXS5odW1pZGl0eVxuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YUN1cnJlbnQuZGF0YS5UUCl7XG4gICAgICAgICAgICAgICAgLy9XU0N1cnJlbnREYXRhLnRlbXBlcmF0dXJlID0gd2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhLlRQLnZhbHVlXG4gICAgICAgICAgICAgICAgV1NDdXJyZW50RGF0YS50ZW1wZXJhdHVyZSA9IHRlbXBlcmF0dXJlXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhLkhEKXtcbiAgICAgICAgICAgICAgICAvL1dTQ3VycmVudERhdGEuaHVtaWRpdHkgPSB3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50LmRhdGEuSEQudmFsdWVcbiAgICAgICAgICAgICAgICBXU0N1cnJlbnREYXRhLmh1bWlkaXR5ID0gaHVtaWRpdHlcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB2YXIgbGFzdERhdGUgPSBudWxsO1xuICAgICAgICAgICAgICAvKmlmKHdlYXRoZXJTdGF0aW9uRGF0YUxhc3Qpe1xuICAgICAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YUxhc3QuZGF0YSl7XG4gICAgICAgICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGFMYXN0LmRhdGEuaGl0cyl7XG4gICAgICAgICAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YUxhc3QuZGF0YS5oaXRzLmhpdHMpe1xuICAgICAgICAgICAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YUxhc3QuZGF0YS5oaXRzLmhpdHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhc3REYXRlID0gd2VhdGhlclN0YXRpb25EYXRhTGFzdC5kYXRhLmhpdHMuaGl0c1swXS5zb3J0WzBdXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9Ki9cbiAgICAgICAgICAgICAgaWYoV1NQYXJzZWREYXRhLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgV1NDdXJyZW50RGF0YS5kYXRlID0gV1NQYXJzZWREYXRhW1dTUGFyc2VkRGF0YS5sZW5ndGgtMV0uZGF0ZVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgIGhpc3RvcmljOiBXU1BhcnNlZERhdGEsXG4gICAgICAgICAgICBjdXJyZW50OiBXU0N1cnJlbnREYXRhXG4gICAgICAgICAgfSxzdGFydERhdGUpO1xuICAgICAgfSlcbiAgICAvL30pO1xuICB9KVxufVxuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgJy4uL2ltcG9ydHMvYXBpL2RhdGEuanMnXG5NZXRlb3Iuc3RhcnR1cCgoKSA9PiB7XG4gIC8vIGNvZGUgdG8gcnVuIG9uIHNlcnZlciBhdCBzdGFydHVwXG59KTtcbiJdfQ==
