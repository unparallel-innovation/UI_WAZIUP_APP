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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvYXBpeHUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2RhcmtTa3kuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2RhdGEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL3dlYXRoZXJTdGF0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9zZXJ2ZXIvbWFpbi5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJhcGl4dSIsIm1vbWVudCIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwiY2FsbGJhY2siLCJzdGFydERhdGUiLCJmb3JtYXRlZERhdGUiLCJmb3JtYXQiLCJNZXRlb3IiLCJjYWxsIiwiZXJyIiwiYXBpeHVEYXRhIiwiYXBpeHVEYXRhQ3VycmVudCIsImFwaXh1UGFyc2VkRGF0YSIsImFwaXh1UGFyc2VkQ3VycmVudERhdGEiLCJkYXRhIiwiZm9yZWNhc3QiLCJmb3JlY2FzdGRheSIsImhvdXIiLCJmb3JFYWNoIiwicHVzaCIsInRlbXBlcmF0dXJlIiwidGVtcF9jIiwiaHVtaWRpdHkiLCJkYXRlIiwiRGF0ZSIsInRpbWVfZXBvY2giLCJnZXRUaW1lIiwiY3VycmVudCIsImxhc3RfdXBkYXRlZF9lcG9jaCIsInNvcnQiLCJhIiwiYiIsImhpc3RvcmljIiwiZGFya1NreSIsImN1cnJlbnRUaW1lIiwiTWF0aCIsInJvdW5kIiwiZGFya1NreURhdGEiLCJkYXJrU2t5UGFyc2VkRGF0YSIsImRhcmtTa3lQYXJzZWRDdXJyZW50RGF0YSIsImhvdXJseSIsInRpbWUiLCJjdXJyZW50bHkiLCJwb3N0RGF0YUxvYWRlciIsIkhUVFAiLCJ3ZWF0aGVyU3RhdGlvbiIsImNhbGxTZXJ2aWNlIiwidHlwZSIsInVybCIsIm9wdGlvbnMiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImVycm9yIiwicmVzdWx0IiwiZ2V0RGlmZlZlY3RvciIsIndlYXRoZXJTdGF0aW9uRGF0YSIsImRhdGFWZWN0IiwiaVRlbXAiLCJpSHVtaWRpdHkiLCJkaWZmVGVtcCIsImRpZmZIdW1pZGl0eSIsImRpZmYiLCJyZWNvcmQiLCJzdW1UZW1wZXJhdHVyZSIsInN1bUh1bWlkaXR5IiwiblRlbXBlcmF0dXJlIiwibkh1bWlkaXR5IiwiYWN0dWFsVGltZSIsImkiLCJsZW5ndGgiLCJkZWx0YSIsImFicyIsInByb3BzIiwib25EYXRhIiwiZSIsIm1hdGNoIiwicGFyYW1zIiwiZCIsInNldEhvdXJzIiwibWlkbmlnaHQiLCJpc1NlcnZlciIsIm1ldGhvZHMiLCJnZXRQYWdlIiwidGhlbiIsImNhdGNoIiwiRXJyb3IiLCJtZXNzYWdlIiwiaGVhZGVycyIsIndlYXRoZXJTdGF0aW9uRGF0YUN1cnJlbnQiLCJXU1BhcnNlZERhdGEiLCJXU0N1cnJlbnREYXRhIiwiaGl0cyIsImhpdCIsIl9zb3VyY2UiLCJhdHRyaWJ1dGUiLCJ2YWx1ZSIsIlRQIiwiSEQiLCJsYXN0RGF0ZSIsInN0YXJ0dXAiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUFBLE9BQU9DLE1BQVAsQ0FBYztBQUFDQyxTQUFNLE1BQUlBO0FBQVgsQ0FBZDtBQUFpQyxJQUFJQyxNQUFKO0FBQVdILE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSxRQUFSLENBQWIsRUFBK0I7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNKLGFBQU9JLENBQVA7QUFBUzs7QUFBckIsQ0FBL0IsRUFBc0QsQ0FBdEQ7O0FBRTVDLFNBQVNMLEtBQVQsQ0FBZU0sUUFBZixFQUF3QkMsU0FBeEIsRUFBa0M7QUFDaEMsTUFBSUMsZUFBZVAsT0FBT00sU0FBUCxFQUFrQkUsTUFBbEIsQ0FBeUIsWUFBekIsQ0FBbkI7QUFDQUMsU0FBT0MsSUFBUCxDQUFZLFNBQVosRUFBc0IsNEZBQTBGSCxZQUFoSCxFQUE2SCxVQUFTSSxHQUFULEVBQWFDLFNBQWIsRUFBdUI7QUFDbEpILFdBQU9DLElBQVAsQ0FBWSxTQUFaLEVBQXNCLHFGQUF0QixFQUE0RyxV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LEdBbEdEO0FBbUdELEM7Ozs7Ozs7Ozs7O0FDdkdELElBQUlHLE1BQUo7QUFBV1osT0FBT0ksS0FBUCxDQUFhQyxRQUFRLGVBQVIsQ0FBYixFQUFzQztBQUFDTyxTQUFPTCxDQUFQLEVBQVM7QUFBQ0ssYUFBT0wsQ0FBUDtBQUFTOztBQUFwQixDQUF0QyxFQUE0RCxDQUE1RDtBQUErRFAsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLHdCQUFSLENBQWI7QUFFMUVPLE9BQU82RixPQUFQLENBQWUsTUFBTSxDQUNuQjtBQUNELENBRkQsRSIsImZpbGUiOiIvYXBwLmpzIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IHthcGl4dX1cbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50J1xuZnVuY3Rpb24gYXBpeHUoY2FsbGJhY2ssc3RhcnREYXRlKXtcbiAgdmFyIGZvcm1hdGVkRGF0ZSA9IG1vbWVudChzdGFydERhdGUpLmZvcm1hdCgnWVlZWS1NTS1ERCcpXG4gIE1ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cDovL2FwaS5hcGl4dS5jb20vdjEvaGlzdG9yeS5qc29uP2tleT0wNWQ3MjU5OWJlZDk0NmQ4OTgzMTU1MDE1MTcwNTEyJnE9Q2FwYXJpY2EmZHQ9Jytmb3JtYXRlZERhdGUsZnVuY3Rpb24oZXJyLGFwaXh1RGF0YSl7XG4gICAgTWV0ZW9yLmNhbGwoJ2dldFBhZ2UnLCdodHRwOi8vYXBpLmFwaXh1LmNvbS92MS9jdXJyZW50Lmpzb24/a2V5PTA1ZDcyNTk5YmVkOTQ2ZDg5ODMxNTUwMTUxNzA1MTImcT1DYXBhcmljYScsZnVuY3Rpb24oZXJyLGFwaXh1RGF0YUN1cnJlbnQpe1xuICAgICAgdmFyIGFwaXh1UGFyc2VkRGF0YSA9IFtdO1xuICAgICAgdmFyIGFwaXh1UGFyc2VkQ3VycmVudERhdGEgPSB7fTtcbiAgICAgIGlmKGFwaXh1RGF0YSl7XG4gICAgICAgIGlmKGFwaXh1RGF0YS5kYXRhKVxuICAgICAgICB7XG4gICAgICAgICAgaWYoYXBpeHVEYXRhLmRhdGEuZm9yZWNhc3Qpe1xuICAgICAgICAgICAgaWYoYXBpeHVEYXRhLmRhdGEuZm9yZWNhc3QuZm9yZWNhc3RkYXkpe1xuICAgICAgICAgICAgICBpZihhcGl4dURhdGEuZGF0YS5mb3JlY2FzdC5mb3JlY2FzdGRheVswXSl7XG4gICAgICAgICAgICAgICAgaWYoYXBpeHVEYXRhLmRhdGEuZm9yZWNhc3QuZm9yZWNhc3RkYXlbMF0uaG91cil7XG4gICAgICAgICAgICAgICAgICBhcGl4dURhdGEuZGF0YS5mb3JlY2FzdC5mb3JlY2FzdGRheVswXS5ob3VyLmZvckVhY2goaG91cj0+e1xuICAgICAgICAgICAgICAgICAgICBhcGl4dVBhcnNlZERhdGEucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgdGVtcGVyYXR1cmU6aG91ci50ZW1wX2MsXG4gICAgICAgICAgICAgICAgICAgICAgaHVtaWRpdHk6IGhvdXIuaHVtaWRpdHksXG4gICAgICAgICAgICAgICAgICAgICAgZGF0ZToobmV3IERhdGUoaG91ci50aW1lX2Vwb2NoKjEwMDApKS5nZXRUaW1lKClcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmKGFwaXh1RGF0YUN1cnJlbnQpe1xuICAgICAgICBpZihhcGl4dURhdGFDdXJyZW50LmRhdGEpXG4gICAgICAgIHtcbiAgICAgICAgICBpZihhcGl4dURhdGFDdXJyZW50LmRhdGEuY3VycmVudCl7XG4gICAgICAgICAgICBhcGl4dVBhcnNlZEN1cnJlbnREYXRhID0ge1xuICAgICAgICAgICAgICBkYXRlOiAobmV3IERhdGUoYXBpeHVEYXRhQ3VycmVudC5kYXRhLmN1cnJlbnQubGFzdF91cGRhdGVkX2Vwb2NoKjEwMDApKS5nZXRUaW1lKCksXG4gICAgICAgICAgICAgIHRlbXBlcmF0dXJlOiBhcGl4dURhdGFDdXJyZW50LmRhdGEuY3VycmVudC50ZW1wX2MsXG4gICAgICAgICAgICAgIGh1bWlkaXR5OiBhcGl4dURhdGFDdXJyZW50LmRhdGEuY3VycmVudC5odW1pZGl0eVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYXBpeHVQYXJzZWREYXRhLnNvcnQoZnVuY3Rpb24oYSxiKSB7cmV0dXJuIChhLmRhdGUgPiBiLmRhdGUpID8gMSA6ICgoYi5kYXRlID4gYS5kYXRlKSA/IC0xIDogMCk7fSApO1xuICAgICAgY2FsbGJhY2soe1xuICAgICAgICBoaXN0b3JpYzogYXBpeHVQYXJzZWREYXRhLFxuICAgICAgICBjdXJyZW50OiBhcGl4dVBhcnNlZEN1cnJlbnREYXRhXG4gICAgICB9LHN0YXJ0RGF0ZSk7XG4gICAgfSk7XG4gIH0pO1xufVxuIiwiZXhwb3J0IHtkYXJrU2t5fVxuXG5mdW5jdGlvbiBkYXJrU2t5KGNhbGxiYWNrLHN0YXJ0RGF0ZSl7XG5cbiAgdmFyIGN1cnJlbnRUaW1lID0gTWF0aC5yb3VuZCgobmV3IERhdGUoc3RhcnREYXRlKSkuZ2V0VGltZSgpLzEwMDApXG4gIE1ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cHM6Ly9hcGkuZGFya3NreS5uZXQvZm9yZWNhc3QvNzkwMmQ2OGYwYjU2NDhjY2U3YjliMTIxMzk0NTE5NzQvMzguNjcsLTkuMiwnK2N1cnJlbnRUaW1lKyc/dW5pdHM9c2knLGZ1bmN0aW9uKGVycixkYXJrU2t5RGF0YSl7XG4gICAgLy9NZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHBzOi8vYXBpLmRhcmtza3kubmV0L2ZvcmVjYXN0Lzc5MDJkNjhmMGI1NjQ4Y2NlN2I5YjEyMTM5NDUxOTc0LzM4LjY3LC05LjI/dW5pdHM9c2knLGZ1bmN0aW9uKGVycixkYXJrU2t5RGF0YUxhc3Qpe1xuXG4gICAgLy9NZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHA6Ly93d3cuc2Fwby5wdCcsZnVuY3Rpb24oZXJyLGRhcmtTa3lEYXRhKXtcbiAgICAgIHZhciBkYXJrU2t5UGFyc2VkRGF0YSA9IFtdO1xuICAgICAgdmFyIGRhcmtTa3lQYXJzZWRDdXJyZW50RGF0YSA9IHt9XG4gICAgICBpZihkYXJrU2t5RGF0YSl7XG4gICAgICAgIGlmKGRhcmtTa3lEYXRhLmRhdGEpe1xuICAgICAgICAgIGlmKGRhcmtTa3lEYXRhLmRhdGEuaG91cmx5KXtcbiAgICAgICAgICAgIGlmKGRhcmtTa3lEYXRhLmRhdGEuaG91cmx5LmRhdGEpe1xuICAgICAgICAgICAgICBkYXJrU2t5RGF0YS5kYXRhLmhvdXJseS5kYXRhLmZvckVhY2goZGF0YT0+e1xuICAgICAgICAgICAgICAgIGRhcmtTa3lQYXJzZWREYXRhLnB1c2goe1xuICAgICAgICAgICAgICAgICAgdGVtcGVyYXR1cmU6ZGF0YS50ZW1wZXJhdHVyZSxcbiAgICAgICAgICAgICAgICAgIGh1bWlkaXR5OiBkYXRhLmh1bWlkaXR5KjEwMCxcbiAgICAgICAgICAgICAgICAgIGRhdGU6KG5ldyBEYXRlKGRhdGEudGltZSoxMDAwKSkuZ2V0VGltZSgpXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmKGRhcmtTa3lEYXRhKXtcbiAgICAgICAgaWYoZGFya1NreURhdGEuZGF0YSlcbiAgICAgICAge1xuICAgICAgICAgIGlmKGRhcmtTa3lEYXRhLmRhdGEuY3VycmVudGx5KVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGRhcmtTa3lQYXJzZWRDdXJyZW50RGF0YSA9IHtcbiAgICAgICAgICAgICAgZGF0ZTogKG5ldyBEYXRlKGRhcmtTa3lEYXRhLmRhdGEuY3VycmVudGx5LnRpbWUqMTAwMCkpLmdldFRpbWUoKSxcbiAgICAgICAgICAgICAgdGVtcGVyYXR1cmU6IGRhcmtTa3lEYXRhLmRhdGEuY3VycmVudGx5LnRlbXBlcmF0dXJlLFxuICAgICAgICAgICAgICBodW1pZGl0eTogZGFya1NreURhdGEuZGF0YS5jdXJyZW50bHkuaHVtaWRpdHkqMTAwXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBkYXJrU2t5UGFyc2VkRGF0YS5zb3J0KGZ1bmN0aW9uKGEsYikge3JldHVybiAoYS5kYXRlID4gYi5kYXRlKSA/IDEgOiAoKGIuZGF0ZSA+IGEuZGF0ZSkgPyAtMSA6IDApO30gKTtcbiAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgaGlzdG9yaWM6IGRhcmtTa3lQYXJzZWREYXRhLFxuICAgICAgICBjdXJyZW50OiBkYXJrU2t5UGFyc2VkQ3VycmVudERhdGFcbiAgICAgIH0sc3RhcnREYXRlKTtcbiAgICAvL30pO1xuICB9KTtcbn1cbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgSFRUUCB9IGZyb20gJ21ldGVvci9odHRwJztcbmltcG9ydCB7d2VhdGhlclN0YXRpb259IGZyb20gJy4vd2VhdGhlclN0YXRpb24uanMnXG5pbXBvcnQge2FwaXh1fSBmcm9tICcuL2FwaXh1LmpzJ1xuaW1wb3J0IHtkYXJrU2t5fSBmcm9tICcuL2RhcmtTa3kuanMnXG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCdcbmV4cG9ydCB7cG9zdERhdGFMb2FkZXJ9XG5cbmNvbnN0IGNhbGxTZXJ2aWNlID0gKHR5cGUsIHVybCwgb3B0aW9ucykgPT4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICBIVFRQLmNhbGwodHlwZSwgdXJsLCBvcHRpb25zLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgIGlmIChlcnJvcikge1xuICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgIH1cbiAgfSk7XG59KTtcblxuZnVuY3Rpb24gZ2V0RGlmZlZlY3Rvcih3ZWF0aGVyU3RhdGlvbkRhdGEsZGF0YVZlY3Qpe1xuICB2YXIgaVRlbXAgPSAwO1xuICB2YXIgaUh1bWlkaXR5ID0gMDtcbiAgdmFyIGRpZmZUZW1wID0gW107XG4gIHZhciBkaWZmSHVtaWRpdHkgPSBbXTtcbiAgdmFyIGRpZmYgPSBbXVxuICBpZihkYXRhVmVjdC5oaXN0b3JpYyl7XG4gICAgZGF0YVZlY3QuaGlzdG9yaWMuZm9yRWFjaChyZWNvcmQ9PntcbiAgICAgIHZhciBzdW1UZW1wZXJhdHVyZSA9IG51bGw7XG4gICAgICB2YXIgc3VtSHVtaWRpdHkgPSBudWxsO1xuICAgICAgdmFyIG5UZW1wZXJhdHVyZSA9IDA7XG4gICAgICB2YXIgbkh1bWlkaXR5ID0gMDtcbiAgICAgIHZhciBhY3R1YWxUaW1lID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcbiAgICAgIGlmKHJlY29yZC5kYXRlPGFjdHVhbFRpbWUpXG4gICAgICB7XG4gICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YS5oaXN0b3JpYyl7XG4gICAgICAgICAgZm9yKHZhciBpPTA7aTx3ZWF0aGVyU3RhdGlvbkRhdGEuaGlzdG9yaWMubGVuZ3RoO2krKylcbiAgICAgICAgICB7XG4gICAgICAgICAgICB2YXIgZGVsdGEgPSByZWNvcmQuZGF0ZS13ZWF0aGVyU3RhdGlvbkRhdGEuaGlzdG9yaWNbaV0uZGF0ZVxuICAgICAgICAgICAgaWYoZGVsdGE8MzYwMDAwMCAmJiBkZWx0YT4wKXtcbiAgICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljW2ldLnRlbXBlcmF0dXJlKVxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc3VtVGVtcGVyYXR1cmUgPSBzdW1UZW1wZXJhdHVyZSArIHdlYXRoZXJTdGF0aW9uRGF0YS5oaXN0b3JpY1tpXS50ZW1wZXJhdHVyZVxuICAgICAgICAgICAgICAgIG5UZW1wZXJhdHVyZSA9IG5UZW1wZXJhdHVyZSArIDE7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljW2ldLmh1bWlkaXR5KVxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc3VtSHVtaWRpdHkgPSBzdW1IdW1pZGl0eSArIHdlYXRoZXJTdGF0aW9uRGF0YS5oaXN0b3JpY1tpXS5odW1pZGl0eVxuICAgICAgICAgICAgICAgIG5IdW1pZGl0eSA9IG5IdW1pZGl0eSArIDE7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1lbHNlIGlmKGRlbHRhIDwwKXtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmKHN1bVRlbXBlcmF0dXJlICYmIHN1bUh1bWlkaXR5KVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGRpZmYucHVzaCh7XG4gICAgICAgICAgICAgIGRhdGU6IHJlY29yZC5kYXRlLFxuICAgICAgICAgICAgICB0ZW1wZXJhdHVyZTogTWF0aC5hYnMoc3VtVGVtcGVyYXR1cmUvblRlbXBlcmF0dXJlIC0gcmVjb3JkLnRlbXBlcmF0dXJlKSxcbiAgICAgICAgICAgICAgaHVtaWRpdHk6IE1hdGguYWJzKHN1bUh1bWlkaXR5L25IdW1pZGl0eSAtIHJlY29yZC5odW1pZGl0eSlcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgIH0pXG4gIH1cbiAgcmV0dXJuIGRpZmZcbn1cblxuZnVuY3Rpb24gcG9zdERhdGFMb2FkZXIocHJvcHMsIG9uRGF0YSxlKSB7XG5cbiAgdmFyIGRhdGUgPSBuZXcgRGF0ZShwcm9wcy5tYXRjaC5wYXJhbXMuZGF0ZSkuZ2V0VGltZSgpO1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIGQuc2V0SG91cnMoMCwwLDAsMCk7XG4gIHZhciBtaWRuaWdodCA9IGQuZ2V0VGltZSgpO1xuICB2YXIgc3RhcnREYXRlID0gZGF0ZT9kYXRlOm1pZG5pZ2h0O1xuXG4gIC8vIGxvYWQgZGF0YSBmcm9tIHRoZSBzZXJ2ZXIuICh1c2luZyBwcm9wcy5pZCB0byBpZGVudGlmeSB0aGUgcG9zdClcbiAgLy8gKEhlcmUnbGwgd2UnbGwgdXNlIHNldFRpbWVvdXQgZm9yIGRlbW9uc3RyYXRpb24gcHVycG9zZSlcbiAgd2VhdGhlclN0YXRpb24oZnVuY3Rpb24od2VhdGhlclN0YXRpb25EYXRhLHN0YXJ0RGF0ZSl7XG4gICAgYXBpeHUoZnVuY3Rpb24oYXBpeHVEYXRhLHN0YXJ0RGF0ZSl7XG4gICAgICBkYXJrU2t5KGZ1bmN0aW9uKGRhcmtTa3lEYXRhLHN0YXJ0RGF0ZSl7XG4gICAgICAgIGFwaXh1RGF0YS5kaWZmID0gZ2V0RGlmZlZlY3Rvcih3ZWF0aGVyU3RhdGlvbkRhdGEsYXBpeHVEYXRhKVxuICAgICAgICBkYXJrU2t5RGF0YS5kaWZmID0gZ2V0RGlmZlZlY3Rvcih3ZWF0aGVyU3RhdGlvbkRhdGEsZGFya1NreURhdGEpXG4gICAgICAgIG9uRGF0YShudWxsLCB7XG4gICAgICAgICAgd2VhdGhlclN0YXRpb246IHdlYXRoZXJTdGF0aW9uRGF0YSxcbiAgICAgICAgICBhcGl4dTogYXBpeHVEYXRhLFxuICAgICAgICAgIGRhcmtTa3k6IGRhcmtTa3lEYXRhLFxuICAgICAgICAgIHN0YXJ0RGF0ZTogbW9tZW50KHN0YXJ0RGF0ZSkuZm9ybWF0KCdZWVlZLU1NLUREJylcbiAgICAgICAgfSlcbiAgICAgIH0sc3RhcnREYXRlKTtcbiAgICB9LHN0YXJ0RGF0ZSk7XG4gIH0sc3RhcnREYXRlKVxufVxuaWYoTWV0ZW9yLmlzU2VydmVyKXtcbiAgTWV0ZW9yLm1ldGhvZHMoe1xuICAgIGdldFBhZ2UodXJsLG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiBjYWxsU2VydmljZShcbiAgICAgICAgJ0dFVCcsXG4gICAgICAgIHVybCxcbiAgICAgICAgb3B0aW9uc1xuICAgICAgKS50aGVuKChyZXN1bHQpID0+IHJlc3VsdCkuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJzUwMCcsIGAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gICAgICB9KTtcbiAgICB9LFxuICB9KTtcbn1cbiIsImV4cG9ydCB7d2VhdGhlclN0YXRpb259XG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCdcbmZ1bmN0aW9uIHdlYXRoZXJTdGF0aW9uKGNhbGxiYWNrLHN0YXJ0RGF0ZSl7XG4gIHZhciBmb3JtYXRlZERhdGUgPSBtb21lbnQoc3RhcnREYXRlKS5mb3JtYXQoJ1lZWVktTU0tREQnKVxuICBNZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHA6Ly9lbGFzdGljc2VhcmNoLndheml1cC5pby93YXppdXAtdWktd2VhdGhlci9fc2VhcmNoP3E9bmFtZTpXZWF0aGVyU3RhdGlvblVJJnNvcnQ9dGltZTpkZXNjJnNpemU9NjAwMCZxPXRpbWU6Jytmb3JtYXRlZERhdGUsZnVuY3Rpb24oZXJyLHdlYXRoZXJTdGF0aW9uRGF0YSl7XG4gICAgLy9NZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHA6Ly9lbGFzdGljc2VhcmNoLndheml1cC5pby93YXppdXAtdWktd2VhdGhlci9fc2VhcmNoP3E9bmFtZTpXZWF0aGVyU3RhdGlvblVJJnNvcnQ9dGltZTpkZXNjJnNpemU9MScsZnVuY3Rpb24oZXJyLHdlYXRoZXJTdGF0aW9uRGF0YUxhc3Qpe1xuXG4gICAgICBNZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHA6Ly9icm9rZXIud2F6aXVwLmlvL3YyL2VudGl0aWVzL1dlYXRoZXJTdGF0aW9uVUknLHtcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgXCJGaXdhcmUtU2VydmljZVBhdGhcIjpcIi9VSS9XRUFUSEVSXCIsXG4gICAgICAgICAgICBcIkZpd2FyZS1TZXJ2aWNlXCI6XCJ3YXppdXBcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxmdW5jdGlvbihlcnIsd2VhdGhlclN0YXRpb25EYXRhQ3VycmVudCl7XG4gICAgICAgICAgdmFyIFdTUGFyc2VkRGF0YSA9IFtdO1xuICAgICAgICAgIHZhciBXU0N1cnJlbnREYXRhID0ge31cbiAgICAgICAgICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgZC5zZXRIb3VycygwLDAsMCwwKTtcbiAgICAgICAgICB2YXIgbWlkbmlnaHQgPSBkLmdldFRpbWUoKTtcbiAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGEuZGF0YSlcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGEuZGF0YS5oaXRzKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGEuZGF0YS5oaXRzLmhpdHMpXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGEuZGF0YS5oaXRzLmhpdHMubGVuZ3RoKVxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIHdlYXRoZXJTdGF0aW9uRGF0YS5kYXRhLmhpdHMuaGl0cy5mb3JFYWNoKGhpdD0+e1xuICAgICAgICAgICAgICAgICAgICBpZigobmV3IERhdGUoaGl0Ll9zb3VyY2UudGltZSkpLmdldFRpbWUoKT5taWRuaWdodC0zNjAwMDAwIHx8IHRydWUpe1xuICAgICAgICAgICAgICAgICAgICAgIGlmKGhpdC5fc291cmNlKVxuICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGhpdC5fc291cmNlLmF0dHJpYnV0ZT09XCJUUFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBXU1BhcnNlZERhdGEucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZToobmV3IERhdGUoaGl0Ll9zb3VyY2UudGltZSkpLmdldFRpbWUoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZW1wZXJhdHVyZTpoaXQuX3NvdXJjZS52YWx1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoaGl0Ll9zb3VyY2UuYXR0cmlidXRlPT1cIkhEXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIFdTUGFyc2VkRGF0YS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRlOihuZXcgRGF0ZShoaXQuX3NvdXJjZS50aW1lKSkuZ2V0VGltZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGh1bWlkaXR5OmhpdC5fc291cmNlLnZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBXU1BhcnNlZERhdGEuc29ydChmdW5jdGlvbihhLGIpIHtyZXR1cm4gKGEuZGF0ZSA+IGIuZGF0ZSkgPyAxIDogKChiLmRhdGUgPiBhLmRhdGUpID8gLTEgOiAwKTt9ICk7XG4gICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhKVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YUN1cnJlbnQuZGF0YSl7XG4gICAgICAgICAgICAgIHZhciB0ZW1wZXJhdHVyZSA9IG51bGw7XG4gICAgICAgICAgICAgIGZvcih2YXIgaT1XU1BhcnNlZERhdGEubGVuZ3RoLTE7aT4wO2ktLSlcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlmKFdTUGFyc2VkRGF0YVtpXS50ZW1wZXJhdHVyZSl7XG4gICAgICAgICAgICAgICAgICB0ZW1wZXJhdHVyZSA9IFdTUGFyc2VkRGF0YVtpXS50ZW1wZXJhdHVyZVxuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHZhciBodW1pZGl0eSA9IG51bGw7XG4gICAgICAgICAgICAgIGZvcih2YXIgaT1XU1BhcnNlZERhdGEubGVuZ3RoLTE7aT4wO2ktLSlcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlmKFdTUGFyc2VkRGF0YVtpXS5odW1pZGl0eSl7XG4gICAgICAgICAgICAgICAgICBodW1pZGl0eSA9IFdTUGFyc2VkRGF0YVtpXS5odW1pZGl0eVxuICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YUN1cnJlbnQuZGF0YS5UUCl7XG4gICAgICAgICAgICAgICAgLy9XU0N1cnJlbnREYXRhLnRlbXBlcmF0dXJlID0gd2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhLlRQLnZhbHVlXG4gICAgICAgICAgICAgICAgV1NDdXJyZW50RGF0YS50ZW1wZXJhdHVyZSA9IHRlbXBlcmF0dXJlXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhLkhEKXtcbiAgICAgICAgICAgICAgICAvL1dTQ3VycmVudERhdGEuaHVtaWRpdHkgPSB3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50LmRhdGEuSEQudmFsdWVcbiAgICAgICAgICAgICAgICBXU0N1cnJlbnREYXRhLmh1bWlkaXR5ID0gaHVtaWRpdHlcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB2YXIgbGFzdERhdGUgPSBudWxsO1xuICAgICAgICAgICAgICAvKmlmKHdlYXRoZXJTdGF0aW9uRGF0YUxhc3Qpe1xuICAgICAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YUxhc3QuZGF0YSl7XG4gICAgICAgICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGFMYXN0LmRhdGEuaGl0cyl7XG4gICAgICAgICAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YUxhc3QuZGF0YS5oaXRzLmhpdHMpe1xuICAgICAgICAgICAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YUxhc3QuZGF0YS5oaXRzLmhpdHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxhc3REYXRlID0gd2VhdGhlclN0YXRpb25EYXRhTGFzdC5kYXRhLmhpdHMuaGl0c1swXS5zb3J0WzBdXG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9Ki9cbiAgICAgICAgICAgICAgaWYoV1NQYXJzZWREYXRhLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgV1NDdXJyZW50RGF0YS5kYXRlID0gV1NQYXJzZWREYXRhW1dTUGFyc2VkRGF0YS5sZW5ndGgtMV0uZGF0ZVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgIGhpc3RvcmljOiBXU1BhcnNlZERhdGEsXG4gICAgICAgICAgICBjdXJyZW50OiBXU0N1cnJlbnREYXRhXG4gICAgICAgICAgfSxzdGFydERhdGUpO1xuICAgICAgfSlcbiAgICAvL30pO1xuICB9KVxufVxuIiwiaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgJy4uL2ltcG9ydHMvYXBpL2RhdGEuanMnXG5NZXRlb3Iuc3RhcnR1cCgoKSA9PiB7XG4gIC8vIGNvZGUgdG8gcnVuIG9uIHNlcnZlciBhdCBzdGFydHVwXG59KTtcbiJdfQ==
