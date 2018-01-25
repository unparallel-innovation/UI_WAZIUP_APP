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

function apixu(callback, startDate, location) {
  var location = location ? location : "38.67,-9.2";
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

function darkSky(callback, startDate, location) {
  var location = location ? location : "38.67,-9.2";
  var currentTime = Math.round(new Date(startDate).getTime() / 1000);
  Meteor.call('getPage', 'https://api.darksky.net/forecast/7902d68f0b5648cce7b9b12139451974/' + location + ',' + currentTime + '?units=si', {
    timeout: 15000
  }, function (err, darkSkyData) {
    //Meteor.call('getPage','https://api.darksky.net/forecast/7902d68f0b5648cce7b9b12139451974/38.67,-9.2?units=si',function(err,darkSkyDataLast){
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

    if (darkSkyData && darkSkyData.data && darkSkyData.data.currently) {
      darkSkyParsedCurrentData = {
        date: new Date(darkSkyData.data.currently.time * 1000).getTime(),
        temperature: darkSkyData.data.currently.temperature,
        humidity: darkSkyData.data.currently.humidity * 100
      };
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
  var location = env.location ? env.location : "38.67,-9.2";
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
      }, startDate, location);
    }, startDate, location);
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

function weatherStation(callback, startDate) {
  var formatedDate = moment(startDate).format('YYYY-MM-DD');
  Meteor.call('getPage', 'http://elasticsearch.waziup.io/waziup-ui-weather/_search?q=name:WeatherStationUI&sort=time:desc&size=6000&q=time:' + formatedDate, {
    timeout: 15000
  }, function (err, weatherStationData) {
    //Meteor.call('getPage','http://elasticsearch.waziup.io/waziup-ui-weather/_search?q=name:WeatherStationUI&sort=time:desc&size=1',function(err,weatherStationDataLast){
    Meteor.call('getPage', 'http://broker.waziup.io/v2/entities/WeatherStationUI', {
      headers: {
        "Fiware-ServicePath": "/UI/WEATHER",
        "Fiware-Service": "waziup"
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

      callback({
        historic: WSParsedData,
        current: WSCurrentData
      }, startDate);
    }); //});
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvYXBpeHUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2RhcmtTa3kuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2RhdGEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL3dlYXRoZXJTdGF0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9zZXJ2ZXIvbWFpbi5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJhcGl4dSIsIm1vbWVudCIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwiY2FsbGJhY2siLCJzdGFydERhdGUiLCJsb2NhdGlvbiIsImZvcm1hdGVkRGF0ZSIsImZvcm1hdCIsIk1ldGVvciIsImNhbGwiLCJ0aW1lb3V0IiwiZXJyIiwiYXBpeHVEYXRhIiwiYXBpeHVEYXRhQ3VycmVudCIsImFwaXh1UGFyc2VkRGF0YSIsImFwaXh1UGFyc2VkQ3VycmVudERhdGEiLCJkYXRhIiwiZm9yZWNhc3QiLCJmb3JlY2FzdGRheSIsImhvdXIiLCJmb3JFYWNoIiwicHVzaCIsInRlbXBlcmF0dXJlIiwidGVtcF9jIiwiaHVtaWRpdHkiLCJkYXRlIiwiRGF0ZSIsInRpbWVfZXBvY2giLCJnZXRUaW1lIiwiY3VycmVudCIsImxhc3RfdXBkYXRlZF9lcG9jaCIsInNvcnQiLCJhIiwiYiIsImhpc3RvcmljIiwiZGFya1NreSIsImN1cnJlbnRUaW1lIiwiTWF0aCIsInJvdW5kIiwiZGFya1NreURhdGEiLCJkYXJrU2t5UGFyc2VkRGF0YSIsImRhcmtTa3lQYXJzZWRDdXJyZW50RGF0YSIsImhvdXJseSIsInRpbWUiLCJjdXJyZW50bHkiLCJwb3N0RGF0YUxvYWRlciIsIkhUVFAiLCJ3ZWF0aGVyU3RhdGlvbiIsImNhbGxTZXJ2aWNlIiwidHlwZSIsInVybCIsIm9wdGlvbnMiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImVycm9yIiwicmVzdWx0IiwiZ2V0RGlmZlZlY3RvciIsIndlYXRoZXJTdGF0aW9uRGF0YSIsImRhdGFWZWN0IiwiaVRlbXAiLCJpSHVtaWRpdHkiLCJkaWZmVGVtcCIsImRpZmZIdW1pZGl0eSIsImRpZmYiLCJyZWNvcmQiLCJzdW1UZW1wZXJhdHVyZSIsInN1bUh1bWlkaXR5IiwiblRlbXBlcmF0dXJlIiwibkh1bWlkaXR5IiwiYWN0dWFsVGltZSIsImkiLCJsZW5ndGgiLCJkZWx0YSIsImFicyIsInByb3BzIiwib25EYXRhIiwiZW52IiwibWF0Y2giLCJwYXJhbXMiLCJkIiwic2V0SG91cnMiLCJtaWRuaWdodCIsImlzU2VydmVyIiwibWV0aG9kcyIsImdldFBhZ2UiLCJ0aGVuIiwiY2F0Y2giLCJFcnJvciIsIm1lc3NhZ2UiLCJoZWFkZXJzIiwid2VhdGhlclN0YXRpb25EYXRhQ3VycmVudCIsIldTUGFyc2VkRGF0YSIsIldTQ3VycmVudERhdGEiLCJoaXRzIiwiaGl0IiwiX3NvdXJjZSIsImF0dHJpYnV0ZSIsInZhbHVlIiwiVFAiLCJIRCIsImxhc3REYXRlIiwic3RhcnR1cCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQUEsT0FBT0MsTUFBUCxDQUFjO0FBQUNDLFNBQU0sTUFBSUE7QUFBWCxDQUFkO0FBQWlDLElBQUlDLE1BQUo7QUFBV0gsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLFFBQVIsQ0FBYixFQUErQjtBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0osYUFBT0ksQ0FBUDtBQUFTOztBQUFyQixDQUEvQixFQUFzRCxDQUF0RDs7QUFFNUMsU0FBU0wsS0FBVCxDQUFlTSxRQUFmLEVBQXdCQyxTQUF4QixFQUFrQ0MsUUFBbEMsRUFBMkM7QUFDekMsTUFBSUEsV0FBV0EsV0FBU0EsUUFBVCxHQUFrQixZQUFqQztBQUNBLE1BQUlDLGVBQWVSLE9BQU9NLFNBQVAsRUFBa0JHLE1BQWxCLENBQXlCLFlBQXpCLENBQW5CO0FBQ0FDLFNBQU9DLElBQVAsQ0FBWSxTQUFaLEVBQXNCLGdGQUE4RUosUUFBOUUsR0FBdUYs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O0FBQ0Q7QUFFRjs7QUFDRHRCLGVBQVM7QUFDUCtCLGtCQUFVMEQsWUFESDtBQUVQL0QsaUJBQVNnRTtBQUZGLE9BQVQsRUFHRXpGLFNBSEY7QUFJSCxLQXBGRCxFQUhtTSxDQXdGck07QUFDRCxHQXpGRDtBQTBGRCxDOzs7Ozs7Ozs7OztBQzlGRCxJQUFJSSxNQUFKO0FBQVdiLE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSxlQUFSLENBQWIsRUFBc0M7QUFBQ1EsU0FBT04sQ0FBUCxFQUFTO0FBQUNNLGFBQU9OLENBQVA7QUFBUzs7QUFBcEIsQ0FBdEMsRUFBNEQsQ0FBNUQ7QUFBK0RQLE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSx3QkFBUixDQUFiO0FBRTFFUSxPQUFPOEYsT0FBUCxDQUFlLE1BQU0sQ0FDbkI7QUFFRCxDQUhELEUiLCJmaWxlIjoiL2FwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCB7YXBpeHV9XG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCdcbmZ1bmN0aW9uIGFwaXh1KGNhbGxiYWNrLHN0YXJ0RGF0ZSxsb2NhdGlvbil7XG4gIHZhciBsb2NhdGlvbiA9IGxvY2F0aW9uP2xvY2F0aW9uOlwiMzguNjcsLTkuMlwiO1xuICB2YXIgZm9ybWF0ZWREYXRlID0gbW9tZW50KHN0YXJ0RGF0ZSkuZm9ybWF0KCdZWVlZLU1NLUREJylcbiAgTWV0ZW9yLmNhbGwoJ2dldFBhZ2UnLCdodHRwOi8vYXBpLmFwaXh1LmNvbS92MS9oaXN0b3J5Lmpzb24/a2V5PTA1ZDcyNTk5YmVkOTQ2ZDg5ODMxNTUwMTUxNzA1MTImcT0nK2xvY2F0aW9uKycmZHQ9Jytmb3JtYXRlZERhdGUse3RpbWVvdXQ6MTUwMDB9LGZ1bmN0aW9uKGVycixhcGl4dURhdGEpe1xuICAgIE1ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cDovL2FwaS5hcGl4dS5jb20vdjEvY3VycmVudC5qc29uP2tleT0wNWQ3MjU5OWJlZDk0NmQ4OTgzMTU1MDE1MTcwNTEyJnE9Jytsb2NhdGlvbix7dGltZW91dDoxNTAwMH0sZnVuY3Rpb24oZXJyLGFwaXh1RGF0YUN1cnJlbnQpe1xuICAgICAgdmFyIGFwaXh1UGFyc2VkRGF0YSA9IFtdO1xuICAgICAgdmFyIGFwaXh1UGFyc2VkQ3VycmVudERhdGEgPSB7fTtcbiAgICAgIGlmKGFwaXh1RGF0YSAmJiBhcGl4dURhdGEuZGF0YSAmJiBhcGl4dURhdGEuZGF0YS5mb3JlY2FzdCAmJiBhcGl4dURhdGEuZGF0YS5mb3JlY2FzdC5mb3JlY2FzdGRheSAmJiAgYXBpeHVEYXRhLmRhdGEuZm9yZWNhc3QuZm9yZWNhc3RkYXlbMF0gJiYgYXBpeHVEYXRhLmRhdGEuZm9yZWNhc3QuZm9yZWNhc3RkYXlbMF0uaG91cil7XG5cbiAgICAgICAgYXBpeHVEYXRhLmRhdGEuZm9yZWNhc3QuZm9yZWNhc3RkYXlbMF0uaG91ci5mb3JFYWNoKGhvdXI9PntcbiAgICAgICAgICBhcGl4dVBhcnNlZERhdGEucHVzaCh7XG4gICAgICAgICAgICB0ZW1wZXJhdHVyZTpob3VyLnRlbXBfYyxcbiAgICAgICAgICAgIGh1bWlkaXR5OiBob3VyLmh1bWlkaXR5LFxuICAgICAgICAgICAgZGF0ZToobmV3IERhdGUoaG91ci50aW1lX2Vwb2NoKjEwMDApKS5nZXRUaW1lKClcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuXG5cbiAgICAgIH1cbiAgICAgIGlmKGFwaXh1RGF0YUN1cnJlbnQgJiYgYXBpeHVEYXRhQ3VycmVudC5kYXRhICYmIGFwaXh1RGF0YUN1cnJlbnQuZGF0YS5jdXJyZW50KXtcbiAgICAgICAgYXBpeHVQYXJzZWRDdXJyZW50RGF0YSA9IHtcbiAgICAgICAgICBkYXRlOiAobmV3IERhdGUoYXBpeHVEYXRhQ3VycmVudC5kYXRhLmN1cnJlbnQubGFzdF91cGRhdGVkX2Vwb2NoKjEwMDApKS5nZXRUaW1lKCksXG4gICAgICAgICAgdGVtcGVyYXR1cmU6IGFwaXh1RGF0YUN1cnJlbnQuZGF0YS5jdXJyZW50LnRlbXBfYyxcbiAgICAgICAgICBodW1pZGl0eTogYXBpeHVEYXRhQ3VycmVudC5kYXRhLmN1cnJlbnQuaHVtaWRpdHlcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYXBpeHVQYXJzZWREYXRhLnNvcnQoZnVuY3Rpb24oYSxiKSB7cmV0dXJuIChhLmRhdGUgPiBiLmRhdGUpID8gMSA6ICgoYi5kYXRlID4gYS5kYXRlKSA/IC0xIDogMCk7fSApO1xuICAgICAgY2FsbGJhY2soe1xuICAgICAgICBoaXN0b3JpYzogYXBpeHVQYXJzZWREYXRhLFxuICAgICAgICBjdXJyZW50OiBhcGl4dVBhcnNlZEN1cnJlbnREYXRhXG4gICAgICB9LHN0YXJ0RGF0ZSk7XG4gICAgfSk7XG4gIH0pO1xufVxuIiwiZXhwb3J0IHtkYXJrU2t5fVxuXG5mdW5jdGlvbiBkYXJrU2t5KGNhbGxiYWNrLHN0YXJ0RGF0ZSxsb2NhdGlvbil7XG4gIHZhciBsb2NhdGlvbiA9IGxvY2F0aW9uP2xvY2F0aW9uOlwiMzguNjcsLTkuMlwiO1xuICB2YXIgY3VycmVudFRpbWUgPSBNYXRoLnJvdW5kKChuZXcgRGF0ZShzdGFydERhdGUpKS5nZXRUaW1lKCkvMTAwMClcbiAgTWV0ZW9yLmNhbGwoJ2dldFBhZ2UnLCdodHRwczovL2FwaS5kYXJrc2t5Lm5ldC9mb3JlY2FzdC83OTAyZDY4ZjBiNTY0OGNjZTdiOWIxMjEzOTQ1MTk3NC8nK2xvY2F0aW9uKycsJytjdXJyZW50VGltZSsnP3VuaXRzPXNpJyx7dGltZW91dDoxNTAwMH0sZnVuY3Rpb24oZXJyLGRhcmtTa3lEYXRhKXtcbiAgICAvL01ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cHM6Ly9hcGkuZGFya3NreS5uZXQvZm9yZWNhc3QvNzkwMmQ2OGYwYjU2NDhjY2U3YjliMTIxMzk0NTE5NzQvMzguNjcsLTkuMj91bml0cz1zaScsZnVuY3Rpb24oZXJyLGRhcmtTa3lEYXRhTGFzdCl7XG5cbiAgICAvL01ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cDovL3d3dy5zYXBvLnB0JyxmdW5jdGlvbihlcnIsZGFya1NreURhdGEpe1xuICAgICAgdmFyIGRhcmtTa3lQYXJzZWREYXRhID0gW107XG4gICAgICB2YXIgZGFya1NreVBhcnNlZEN1cnJlbnREYXRhID0ge31cbiAgICAgIGlmKGRhcmtTa3lEYXRhICYmIGRhcmtTa3lEYXRhLmRhdGEgJiYgZGFya1NreURhdGEuZGF0YS5ob3VybHkgJiYgZGFya1NreURhdGEuZGF0YS5ob3VybHkuZGF0YSl7XG4gICAgICAgIGRhcmtTa3lEYXRhLmRhdGEuaG91cmx5LmRhdGEuZm9yRWFjaChkYXRhPT57XG4gICAgICAgICAgZGFya1NreVBhcnNlZERhdGEucHVzaCh7XG4gICAgICAgICAgICB0ZW1wZXJhdHVyZTpkYXRhLnRlbXBlcmF0dXJlLFxuICAgICAgICAgICAgaHVtaWRpdHk6IGRhdGEuaHVtaWRpdHkqMTAwLFxuICAgICAgICAgICAgZGF0ZToobmV3IERhdGUoZGF0YS50aW1lKjEwMDApKS5nZXRUaW1lKClcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgaWYoZGFya1NreURhdGEgJiYgIGRhcmtTa3lEYXRhLmRhdGEgJiYgZGFya1NreURhdGEuZGF0YS5jdXJyZW50bHkpe1xuICAgICAgICBkYXJrU2t5UGFyc2VkQ3VycmVudERhdGEgPSB7XG4gICAgICAgICAgZGF0ZTogKG5ldyBEYXRlKGRhcmtTa3lEYXRhLmRhdGEuY3VycmVudGx5LnRpbWUqMTAwMCkpLmdldFRpbWUoKSxcbiAgICAgICAgICB0ZW1wZXJhdHVyZTogZGFya1NreURhdGEuZGF0YS5jdXJyZW50bHkudGVtcGVyYXR1cmUsXG4gICAgICAgICAgaHVtaWRpdHk6IGRhcmtTa3lEYXRhLmRhdGEuY3VycmVudGx5Lmh1bWlkaXR5KjEwMFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBkYXJrU2t5UGFyc2VkRGF0YS5zb3J0KGZ1bmN0aW9uKGEsYikge3JldHVybiAoYS5kYXRlID4gYi5kYXRlKSA/IDEgOiAoKGIuZGF0ZSA+IGEuZGF0ZSkgPyAtMSA6IDApO30gKTtcbiAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgaGlzdG9yaWM6IGRhcmtTa3lQYXJzZWREYXRhLFxuICAgICAgICBjdXJyZW50OiBkYXJrU2t5UGFyc2VkQ3VycmVudERhdGFcbiAgICAgIH0sc3RhcnREYXRlKTtcbiAgICAvL30pO1xuICB9KTtcbn1cbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgSFRUUCB9IGZyb20gJ21ldGVvci9odHRwJztcbmltcG9ydCB7d2VhdGhlclN0YXRpb259IGZyb20gJy4vd2VhdGhlclN0YXRpb24uanMnXG5pbXBvcnQge2FwaXh1fSBmcm9tICcuL2FwaXh1LmpzJ1xuaW1wb3J0IHtkYXJrU2t5fSBmcm9tICcuL2RhcmtTa3kuanMnXG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCdcbmV4cG9ydCB7cG9zdERhdGFMb2FkZXJ9XG5cbmNvbnN0IGNhbGxTZXJ2aWNlID0gKHR5cGUsIHVybCwgb3B0aW9ucykgPT4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICBIVFRQLmNhbGwodHlwZSwgdXJsLCBvcHRpb25zLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgIGlmIChlcnJvcikge1xuICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgIH1cbiAgfSk7XG59KTtcblxuZnVuY3Rpb24gZ2V0RGlmZlZlY3Rvcih3ZWF0aGVyU3RhdGlvbkRhdGEsZGF0YVZlY3Qpe1xuICB2YXIgaVRlbXAgPSAwO1xuICB2YXIgaUh1bWlkaXR5ID0gMDtcbiAgdmFyIGRpZmZUZW1wID0gW107XG4gIHZhciBkaWZmSHVtaWRpdHkgPSBbXTtcbiAgdmFyIGRpZmYgPSBbXVxuICBpZihkYXRhVmVjdC5oaXN0b3JpYyl7XG4gICAgZGF0YVZlY3QuaGlzdG9yaWMuZm9yRWFjaChyZWNvcmQ9PntcbiAgICAgIHZhciBzdW1UZW1wZXJhdHVyZSA9IG51bGw7XG4gICAgICB2YXIgc3VtSHVtaWRpdHkgPSBudWxsO1xuICAgICAgdmFyIG5UZW1wZXJhdHVyZSA9IDA7XG4gICAgICB2YXIgbkh1bWlkaXR5ID0gMDtcbiAgICAgIHZhciBhY3R1YWxUaW1lID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcbiAgICAgIGlmKHJlY29yZC5kYXRlPGFjdHVhbFRpbWUpXG4gICAgICB7XG4gICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YS5oaXN0b3JpYyl7XG4gICAgICAgICAgZm9yKHZhciBpPTA7aTx3ZWF0aGVyU3RhdGlvbkRhdGEuaGlzdG9yaWMubGVuZ3RoO2krKylcbiAgICAgICAgICB7XG4gICAgICAgICAgICB2YXIgZGVsdGEgPSByZWNvcmQuZGF0ZS13ZWF0aGVyU3RhdGlvbkRhdGEuaGlzdG9yaWNbaV0uZGF0ZVxuXG4gICAgICAgICAgICBpZihkZWx0YTwzNjAwMDAwKXtcbiAgICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljW2ldLnRlbXBlcmF0dXJlKVxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc3VtVGVtcGVyYXR1cmUgPSBzdW1UZW1wZXJhdHVyZSArIHdlYXRoZXJTdGF0aW9uRGF0YS5oaXN0b3JpY1tpXS50ZW1wZXJhdHVyZVxuICAgICAgICAgICAgICAgIG5UZW1wZXJhdHVyZSA9IG5UZW1wZXJhdHVyZSArIDE7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljW2ldLmh1bWlkaXR5KVxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc3VtSHVtaWRpdHkgPSBzdW1IdW1pZGl0eSArIHdlYXRoZXJTdGF0aW9uRGF0YS5oaXN0b3JpY1tpXS5odW1pZGl0eVxuICAgICAgICAgICAgICAgIG5IdW1pZGl0eSA9IG5IdW1pZGl0eSArIDE7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1lbHNlIGlmKGRlbHRhIDwwKXtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmKHN1bVRlbXBlcmF0dXJlICYmIHN1bUh1bWlkaXR5KVxuICAgICAgICAgIHtcblxuICAgICAgICAgICAgZGlmZi5wdXNoKHtcbiAgICAgICAgICAgICAgZGF0ZTogcmVjb3JkLmRhdGUsXG4gICAgICAgICAgICAgIHRlbXBlcmF0dXJlOiBNYXRoLmFicyhzdW1UZW1wZXJhdHVyZS9uVGVtcGVyYXR1cmUgLSByZWNvcmQudGVtcGVyYXR1cmUpLFxuICAgICAgICAgICAgICBodW1pZGl0eTogTWF0aC5hYnMoc3VtSHVtaWRpdHkvbkh1bWlkaXR5IC0gcmVjb3JkLmh1bWlkaXR5KVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgfSlcbiAgfVxuICByZXR1cm4gZGlmZlxufVxuXG5mdW5jdGlvbiBwb3N0RGF0YUxvYWRlcihwcm9wcywgb25EYXRhLGVudikge1xuICB2YXIgbG9jYXRpb24gPSBlbnYubG9jYXRpb24/ZW52LmxvY2F0aW9uOlwiMzguNjcsLTkuMlwiXG4gIHZhciBkYXRlID0gbmV3IERhdGUocHJvcHMubWF0Y2gucGFyYW1zLmRhdGUpLmdldFRpbWUoKTtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICBkLnNldEhvdXJzKDAsMCwwLDApO1xuICB2YXIgbWlkbmlnaHQgPSBkLmdldFRpbWUoKTtcbiAgdmFyIHN0YXJ0RGF0ZSA9IGRhdGU/ZGF0ZTptaWRuaWdodDtcblxuICAvLyBsb2FkIGRhdGEgZnJvbSB0aGUgc2VydmVyLiAodXNpbmcgcHJvcHMuaWQgdG8gaWRlbnRpZnkgdGhlIHBvc3QpXG4gIC8vIChIZXJlJ2xsIHdlJ2xsIHVzZSBzZXRUaW1lb3V0IGZvciBkZW1vbnN0cmF0aW9uIHB1cnBvc2UpXG4gIHdlYXRoZXJTdGF0aW9uKGZ1bmN0aW9uKHdlYXRoZXJTdGF0aW9uRGF0YSxzdGFydERhdGUpe1xuICAgIGFwaXh1KGZ1bmN0aW9uKGFwaXh1RGF0YSxzdGFydERhdGUpe1xuICAgICAgZGFya1NreShmdW5jdGlvbihkYXJrU2t5RGF0YSxzdGFydERhdGUpe1xuICAgICAgICBhcGl4dURhdGEuZGlmZiA9IGdldERpZmZWZWN0b3Iod2VhdGhlclN0YXRpb25EYXRhLGFwaXh1RGF0YSlcbiAgICAgICAgZGFya1NreURhdGEuZGlmZiA9IGdldERpZmZWZWN0b3Iod2VhdGhlclN0YXRpb25EYXRhLGRhcmtTa3lEYXRhKVxuICAgICAgICBvbkRhdGEobnVsbCwge1xuICAgICAgICAgIHdlYXRoZXJTdGF0aW9uOiB3ZWF0aGVyU3RhdGlvbkRhdGEsXG4gICAgICAgICAgYXBpeHU6IGFwaXh1RGF0YSxcbiAgICAgICAgICBkYXJrU2t5OiBkYXJrU2t5RGF0YSxcbiAgICAgICAgICBzdGFydERhdGU6IG1vbWVudChzdGFydERhdGUpLmZvcm1hdCgnWVlZWS1NTS1ERCcpXG4gICAgICAgIH0pXG4gICAgICB9LHN0YXJ0RGF0ZSxsb2NhdGlvbik7XG4gICAgfSxzdGFydERhdGUsbG9jYXRpb24pO1xuICB9LHN0YXJ0RGF0ZSlcbn1cbmlmKE1ldGVvci5pc1NlcnZlcil7XG4gIE1ldGVvci5tZXRob2RzKHtcbiAgICBnZXRQYWdlKHVybCxvcHRpb25zKSB7XG4gICAgICByZXR1cm4gY2FsbFNlcnZpY2UoXG4gICAgICAgICdHRVQnLFxuICAgICAgICB1cmwsXG4gICAgICAgIG9wdGlvbnNcbiAgICAgICkudGhlbigocmVzdWx0KSA9PiByZXN1bHQpLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCc1MDAnLCBgJHtlcnJvci5tZXNzYWdlfWApO1xuICAgICAgfSk7XG4gICAgfSxcbiAgfSk7XG59XG4iLCJleHBvcnQge3dlYXRoZXJTdGF0aW9ufVxuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnXG5mdW5jdGlvbiB3ZWF0aGVyU3RhdGlvbihjYWxsYmFjayxzdGFydERhdGUpe1xuICB2YXIgZm9ybWF0ZWREYXRlID0gbW9tZW50KHN0YXJ0RGF0ZSkuZm9ybWF0KCdZWVlZLU1NLUREJylcbiAgTWV0ZW9yLmNhbGwoJ2dldFBhZ2UnLCdodHRwOi8vZWxhc3RpY3NlYXJjaC53YXppdXAuaW8vd2F6aXVwLXVpLXdlYXRoZXIvX3NlYXJjaD9xPW5hbWU6V2VhdGhlclN0YXRpb25VSSZzb3J0PXRpbWU6ZGVzYyZzaXplPTYwMDAmcT10aW1lOicrZm9ybWF0ZWREYXRlLHt0aW1lb3V0OjE1MDAwfSxmdW5jdGlvbihlcnIsd2VhdGhlclN0YXRpb25EYXRhKXtcbiAgICAvL01ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cDovL2VsYXN0aWNzZWFyY2gud2F6aXVwLmlvL3dheml1cC11aS13ZWF0aGVyL19zZWFyY2g/cT1uYW1lOldlYXRoZXJTdGF0aW9uVUkmc29ydD10aW1lOmRlc2Mmc2l6ZT0xJyxmdW5jdGlvbihlcnIsd2VhdGhlclN0YXRpb25EYXRhTGFzdCl7XG5cbiAgICAgIE1ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cDovL2Jyb2tlci53YXppdXAuaW8vdjIvZW50aXRpZXMvV2VhdGhlclN0YXRpb25VSScse1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICBcIkZpd2FyZS1TZXJ2aWNlUGF0aFwiOlwiL1VJL1dFQVRIRVJcIixcbiAgICAgICAgICAgIFwiRml3YXJlLVNlcnZpY2VcIjpcIndheml1cFwiXG4gICAgICAgICAgfSxcbiAgICAgICAgICB0aW1lb3V0OiAxNTAwMFxuICAgICAgICB9LGZ1bmN0aW9uKGVycix3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50KXtcbiAgICAgICAgICB2YXIgV1NQYXJzZWREYXRhID0gW107XG4gICAgICAgICAgdmFyIFdTQ3VycmVudERhdGEgPSB7fVxuICAgICAgICAgIHZhciBkID0gbmV3IERhdGUoKTtcbiAgICAgICAgICBkLnNldEhvdXJzKDAsMCwwLDApO1xuICAgICAgICAgIHZhciBtaWRuaWdodCA9IGQuZ2V0VGltZSgpO1xuICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YSAmJiB3ZWF0aGVyU3RhdGlvbkRhdGEuZGF0YSAmJiB3ZWF0aGVyU3RhdGlvbkRhdGEuZGF0YS5oaXRzICYmIHdlYXRoZXJTdGF0aW9uRGF0YS5kYXRhLmhpdHMuaGl0cyAmJiB3ZWF0aGVyU3RhdGlvbkRhdGEuZGF0YS5oaXRzLmhpdHMubGVuZ3RoIClcbiAgICAgICAgICB7XG4gICAgICAgICAgICB3ZWF0aGVyU3RhdGlvbkRhdGEuZGF0YS5oaXRzLmhpdHMuZm9yRWFjaChoaXQ9PntcbiAgICAgICAgICAgICAgaWYoKG5ldyBEYXRlKGhpdC5fc291cmNlLnRpbWUpKS5nZXRUaW1lKCk+bWlkbmlnaHQtMzYwMDAwMCB8fCB0cnVlKXtcbiAgICAgICAgICAgICAgICBpZihoaXQuX3NvdXJjZSlcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBpZihoaXQuX3NvdXJjZS5hdHRyaWJ1dGU9PVwiVFBcIilcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgV1NQYXJzZWREYXRhLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgIGRhdGU6KG5ldyBEYXRlKGhpdC5fc291cmNlLnRpbWUpKS5nZXRUaW1lKCksXG4gICAgICAgICAgICAgICAgICAgICAgdGVtcGVyYXR1cmU6aGl0Ll9zb3VyY2UudmFsdWVcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGlmKGhpdC5fc291cmNlLmF0dHJpYnV0ZT09XCJIRFwiKVxuICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBXU1BhcnNlZERhdGEucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgZGF0ZToobmV3IERhdGUoaGl0Ll9zb3VyY2UudGltZSkpLmdldFRpbWUoKSxcbiAgICAgICAgICAgICAgICAgICAgICBodW1pZGl0eTpoaXQuX3NvdXJjZS52YWx1ZVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9XG4gICAgICAgICAgV1NQYXJzZWREYXRhLnNvcnQoZnVuY3Rpb24oYSxiKSB7cmV0dXJuIChhLmRhdGUgPiBiLmRhdGUpID8gMSA6ICgoYi5kYXRlID4gYS5kYXRlKSA/IC0xIDogMCk7fSApO1xuICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YUN1cnJlbnQgJiYgd2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhKVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHZhciB0ZW1wZXJhdHVyZSA9IG51bGw7XG4gICAgICAgICAgICBmb3IodmFyIGk9V1NQYXJzZWREYXRhLmxlbmd0aC0xO2k+MDtpLS0pXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGlmKFdTUGFyc2VkRGF0YVtpXS50ZW1wZXJhdHVyZSl7XG4gICAgICAgICAgICAgICAgdGVtcGVyYXR1cmUgPSBXU1BhcnNlZERhdGFbaV0udGVtcGVyYXR1cmVcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGh1bWlkaXR5ID0gbnVsbDtcbiAgICAgICAgICAgIGZvcih2YXIgaT1XU1BhcnNlZERhdGEubGVuZ3RoLTE7aT4wO2ktLSlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgaWYoV1NQYXJzZWREYXRhW2ldLmh1bWlkaXR5KXtcbiAgICAgICAgICAgICAgICBodW1pZGl0eSA9IFdTUGFyc2VkRGF0YVtpXS5odW1pZGl0eVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50LmRhdGEuVFApe1xuICAgICAgICAgICAgICAvL1dTQ3VycmVudERhdGEudGVtcGVyYXR1cmUgPSB3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50LmRhdGEuVFAudmFsdWVcbiAgICAgICAgICAgICAgV1NDdXJyZW50RGF0YS50ZW1wZXJhdHVyZSA9IHRlbXBlcmF0dXJlXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50LmRhdGEuSEQpe1xuICAgICAgICAgICAgICAvL1dTQ3VycmVudERhdGEuaHVtaWRpdHkgPSB3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50LmRhdGEuSEQudmFsdWVcbiAgICAgICAgICAgICAgV1NDdXJyZW50RGF0YS5odW1pZGl0eSA9IGh1bWlkaXR5XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbGFzdERhdGUgPSBudWxsO1xuICAgICAgICAgICAgLyppZih3ZWF0aGVyU3RhdGlvbkRhdGFMYXN0KXtcbiAgICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhTGFzdC5kYXRhKXtcbiAgICAgICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGFMYXN0LmRhdGEuaGl0cyl7XG4gICAgICAgICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGFMYXN0LmRhdGEuaGl0cy5oaXRzKXtcbiAgICAgICAgICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhTGFzdC5kYXRhLmhpdHMuaGl0cy5sZW5ndGgpe1xuICAgICAgICAgICAgICAgICAgICAgIGxhc3REYXRlID0gd2VhdGhlclN0YXRpb25EYXRhTGFzdC5kYXRhLmhpdHMuaGl0c1swXS5zb3J0WzBdXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0qL1xuICAgICAgICAgICAgaWYoV1NQYXJzZWREYXRhLmxlbmd0aCl7XG4gICAgICAgICAgICAgIFdTQ3VycmVudERhdGEuZGF0ZSA9IFdTUGFyc2VkRGF0YVtXU1BhcnNlZERhdGEubGVuZ3RoLTFdLmRhdGVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIH1cbiAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICBoaXN0b3JpYzogV1NQYXJzZWREYXRhLFxuICAgICAgICAgICAgY3VycmVudDogV1NDdXJyZW50RGF0YVxuICAgICAgICAgIH0sc3RhcnREYXRlKTtcbiAgICAgIH0pXG4gICAgLy99KTtcbiAgfSlcbn1cbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0ICcuLi9pbXBvcnRzL2FwaS9kYXRhLmpzJ1xuTWV0ZW9yLnN0YXJ0dXAoKCkgPT4ge1xuICAvLyBjb2RlIHRvIHJ1biBvbiBzZXJ2ZXIgYXQgc3RhcnR1cFxuXG59KTtcbiJdfQ==
