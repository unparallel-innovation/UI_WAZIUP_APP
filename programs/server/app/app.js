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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvYXBpeHUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2RhcmtTa3kuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2RhdGEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL3dlYXRoZXJTdGF0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9zZXJ2ZXIvbWFpbi5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJhcGl4dSIsIm1vbWVudCIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwiY2FsbGJhY2siLCJzdGFydERhdGUiLCJsb2NhdGlvbiIsImZvcm1hdGVkRGF0ZSIsImZvcm1hdCIsIk1ldGVvciIsImNhbGwiLCJ0aW1lb3V0IiwiZXJyIiwiYXBpeHVEYXRhIiwiYXBpeHVEYXRhQ3VycmVudCIsImFwaXh1UGFyc2VkRGF0YSIsImFwaXh1UGFyc2VkQ3VycmVudERhdGEiLCJkYXRhIiwiZm9yZWNhc3QiLCJmb3JlY2FzdGRheSIsImhvdXIiLCJmb3JFYWNoIiwicHVzaCIsInRlbXBlcmF0dXJlIiwidGVtcF9jIiwiaHVtaWRpdHkiLCJkYXRlIiwiRGF0ZSIsInRpbWVfZXBvY2giLCJnZXRUaW1lIiwiY3VycmVudCIsImxhc3RfdXBkYXRlZF9lcG9jaCIsInNvcnQiLCJhIiwiYiIsImhpc3RvcmljIiwiZGFya1NreSIsImN1cnJlbnRUaW1lIiwiTWF0aCIsInJvdW5kIiwiZGFya1NreURhdGEiLCJkYXJrU2t5UGFyc2VkRGF0YSIsImRhcmtTa3lQYXJzZWRDdXJyZW50RGF0YSIsImhvdXJseSIsInRpbWUiLCJjdXJyZW50bHkiLCJwb3N0RGF0YUxvYWRlciIsIkhUVFAiLCJ3ZWF0aGVyU3RhdGlvbiIsImNhbGxTZXJ2aWNlIiwidHlwZSIsInVybCIsIm9wdGlvbnMiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImVycm9yIiwicmVzdWx0IiwiZ2V0RGlmZlZlY3RvciIsIndlYXRoZXJTdGF0aW9uRGF0YSIsImRhdGFWZWN0IiwiaVRlbXAiLCJpSHVtaWRpdHkiLCJkaWZmVGVtcCIsImRpZmZIdW1pZGl0eSIsImRpZmYiLCJyZWNvcmQiLCJzdW1UZW1wZXJhdHVyZSIsInN1bUh1bWlkaXR5IiwiblRlbXBlcmF0dXJlIiwibkh1bWlkaXR5IiwiYWN0dWFsVGltZSIsImkiLCJsZW5ndGgiLCJkZWx0YSIsImFicyIsInByb3BzIiwib25EYXRhIiwiZW52IiwibWF0Y2giLCJwYXJhbXMiLCJkIiwic2V0SG91cnMiLCJtaWRuaWdodCIsImlzU2VydmVyIiwibWV0aG9kcyIsImdldFBhZ2UiLCJ0aGVuIiwiY2F0Y2giLCJFcnJvciIsIm1lc3NhZ2UiLCJoZWFkZXJzIiwid2VhdGhlclN0YXRpb25EYXRhQ3VycmVudCIsIldTUGFyc2VkRGF0YSIsIldTQ3VycmVudERhdGEiLCJoaXRzIiwiaGl0IiwiX3NvdXJjZSIsImF0dHJpYnV0ZSIsInZhbHVlIiwiVFAiLCJIRCIsImxhc3REYXRlIiwic3RhcnR1cCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQUEsT0FBT0MsTUFBUCxDQUFjO0FBQUNDLFNBQU0sTUFBSUE7QUFBWCxDQUFkO0FBQWlDLElBQUlDLE1BQUo7QUFBV0gsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLFFBQVIsQ0FBYixFQUErQjtBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0osYUFBT0ksQ0FBUDtBQUFTOztBQUFyQixDQUEvQixFQUFzRCxDQUF0RDs7QUFFNUMsU0FBU0wsS0FBVCxDQUFlTSxRQUFmLEVBQXdCQyxTQUF4QixFQUFrQ0MsUUFBbEMsRUFBMkM7QUFDekMsTUFBSUEsV0FBV0EsV0FBU0EsUUFBVCxHQUFrQixZQUFqQztBQUNBLE1BQUlDLGVBQWVSLE9BQU9NLFNBQVAsRUFBa0JHLE1BQWxCLENBQXlCLFlBQXpCLENBQW5CO0FBQ0FDLFNBQU9DLElBQVAsQ0FBWSxTQUFaLEVBQXNCLGdGQUE4RUosUUFBOUUsR0FBdUYs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Q0FBakMsRUFBb0MvQyxJQUF6RDtBQUNEO0FBRUY7O0FBQ0R0QixlQUFTO0FBQ1ArQixrQkFBVTBELFlBREg7QUFFUC9ELGlCQUFTZ0U7QUFGRixPQUFULEVBR0V6RixTQUhGO0FBSUgsS0FwRkQsRUFIbU0sQ0F3RnJNO0FBQ0QsR0F6RkQ7QUEwRkQsQzs7Ozs7Ozs7Ozs7QUM5RkQsSUFBSUksTUFBSjtBQUFXYixPQUFPSSxLQUFQLENBQWFDLFFBQVEsZUFBUixDQUFiLEVBQXNDO0FBQUNRLFNBQU9OLENBQVAsRUFBUztBQUFDTSxhQUFPTixDQUFQO0FBQVM7O0FBQXBCLENBQXRDLEVBQTRELENBQTVEO0FBQStEUCxPQUFPSSxLQUFQLENBQWFDLFFBQVEsd0JBQVIsQ0FBYjtBQUUxRVEsT0FBTzhGLE9BQVAsQ0FBZSxNQUFNLENBQ25CO0FBQ0QsQ0FGRCxFIiwiZmlsZSI6Ii9hcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQge2FwaXh1fVxuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnXG5mdW5jdGlvbiBhcGl4dShjYWxsYmFjayxzdGFydERhdGUsbG9jYXRpb24pe1xuICB2YXIgbG9jYXRpb24gPSBsb2NhdGlvbj9sb2NhdGlvbjpcIjM4LjY3LC05LjJcIjtcbiAgdmFyIGZvcm1hdGVkRGF0ZSA9IG1vbWVudChzdGFydERhdGUpLmZvcm1hdCgnWVlZWS1NTS1ERCcpXG4gIE1ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cDovL2FwaS5hcGl4dS5jb20vdjEvaGlzdG9yeS5qc29uP2tleT0wNWQ3MjU5OWJlZDk0NmQ4OTgzMTU1MDE1MTcwNTEyJnE9Jytsb2NhdGlvbisnJmR0PScrZm9ybWF0ZWREYXRlLHt0aW1lb3V0OjE1MDAwfSxmdW5jdGlvbihlcnIsYXBpeHVEYXRhKXtcbiAgICBNZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHA6Ly9hcGkuYXBpeHUuY29tL3YxL2N1cnJlbnQuanNvbj9rZXk9MDVkNzI1OTliZWQ5NDZkODk4MzE1NTAxNTE3MDUxMiZxPScrbG9jYXRpb24se3RpbWVvdXQ6MTUwMDB9LGZ1bmN0aW9uKGVycixhcGl4dURhdGFDdXJyZW50KXtcbiAgICAgIHZhciBhcGl4dVBhcnNlZERhdGEgPSBbXTtcbiAgICAgIHZhciBhcGl4dVBhcnNlZEN1cnJlbnREYXRhID0ge307XG4gICAgICBpZihhcGl4dURhdGEgJiYgYXBpeHVEYXRhLmRhdGEgJiYgYXBpeHVEYXRhLmRhdGEuZm9yZWNhc3QgJiYgYXBpeHVEYXRhLmRhdGEuZm9yZWNhc3QuZm9yZWNhc3RkYXkgJiYgIGFwaXh1RGF0YS5kYXRhLmZvcmVjYXN0LmZvcmVjYXN0ZGF5WzBdICYmIGFwaXh1RGF0YS5kYXRhLmZvcmVjYXN0LmZvcmVjYXN0ZGF5WzBdLmhvdXIpe1xuXG4gICAgICAgIGFwaXh1RGF0YS5kYXRhLmZvcmVjYXN0LmZvcmVjYXN0ZGF5WzBdLmhvdXIuZm9yRWFjaChob3VyPT57XG4gICAgICAgICAgYXBpeHVQYXJzZWREYXRhLnB1c2goe1xuICAgICAgICAgICAgdGVtcGVyYXR1cmU6aG91ci50ZW1wX2MsXG4gICAgICAgICAgICBodW1pZGl0eTogaG91ci5odW1pZGl0eSxcbiAgICAgICAgICAgIGRhdGU6KG5ldyBEYXRlKGhvdXIudGltZV9lcG9jaCoxMDAwKSkuZ2V0VGltZSgpXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcblxuXG4gICAgICB9XG4gICAgICBpZihhcGl4dURhdGFDdXJyZW50ICYmIGFwaXh1RGF0YUN1cnJlbnQuZGF0YSAmJiBhcGl4dURhdGFDdXJyZW50LmRhdGEuY3VycmVudCl7XG4gICAgICAgIGFwaXh1UGFyc2VkQ3VycmVudERhdGEgPSB7XG4gICAgICAgICAgZGF0ZTogKG5ldyBEYXRlKGFwaXh1RGF0YUN1cnJlbnQuZGF0YS5jdXJyZW50Lmxhc3RfdXBkYXRlZF9lcG9jaCoxMDAwKSkuZ2V0VGltZSgpLFxuICAgICAgICAgIHRlbXBlcmF0dXJlOiBhcGl4dURhdGFDdXJyZW50LmRhdGEuY3VycmVudC50ZW1wX2MsXG4gICAgICAgICAgaHVtaWRpdHk6IGFwaXh1RGF0YUN1cnJlbnQuZGF0YS5jdXJyZW50Lmh1bWlkaXR5XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFwaXh1UGFyc2VkRGF0YS5zb3J0KGZ1bmN0aW9uKGEsYikge3JldHVybiAoYS5kYXRlID4gYi5kYXRlKSA/IDEgOiAoKGIuZGF0ZSA+IGEuZGF0ZSkgPyAtMSA6IDApO30gKTtcbiAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgaGlzdG9yaWM6IGFwaXh1UGFyc2VkRGF0YSxcbiAgICAgICAgY3VycmVudDogYXBpeHVQYXJzZWRDdXJyZW50RGF0YVxuICAgICAgfSxzdGFydERhdGUpO1xuICAgIH0pO1xuICB9KTtcbn1cbiIsImV4cG9ydCB7ZGFya1NreX1cblxuZnVuY3Rpb24gZGFya1NreShjYWxsYmFjayxzdGFydERhdGUsbG9jYXRpb24pe1xuICB2YXIgbG9jYXRpb24gPSBsb2NhdGlvbj9sb2NhdGlvbjpcIjM4LjY3LC05LjJcIjtcbiAgdmFyIGN1cnJlbnRUaW1lID0gTWF0aC5yb3VuZCgobmV3IERhdGUoc3RhcnREYXRlKSkuZ2V0VGltZSgpLzEwMDApXG4gIE1ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cHM6Ly9hcGkuZGFya3NreS5uZXQvZm9yZWNhc3QvNzkwMmQ2OGYwYjU2NDhjY2U3YjliMTIxMzk0NTE5NzQvJytsb2NhdGlvbisnLCcrY3VycmVudFRpbWUrJz91bml0cz1zaScse3RpbWVvdXQ6MTUwMDB9LGZ1bmN0aW9uKGVycixkYXJrU2t5RGF0YSl7XG4gICAgLy9NZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHBzOi8vYXBpLmRhcmtza3kubmV0L2ZvcmVjYXN0Lzc5MDJkNjhmMGI1NjQ4Y2NlN2I5YjEyMTM5NDUxOTc0LzM4LjY3LC05LjI/dW5pdHM9c2knLGZ1bmN0aW9uKGVycixkYXJrU2t5RGF0YUxhc3Qpe1xuXG4gICAgLy9NZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHA6Ly93d3cuc2Fwby5wdCcsZnVuY3Rpb24oZXJyLGRhcmtTa3lEYXRhKXtcbiAgICAgIHZhciBkYXJrU2t5UGFyc2VkRGF0YSA9IFtdO1xuICAgICAgdmFyIGRhcmtTa3lQYXJzZWRDdXJyZW50RGF0YSA9IHt9XG4gICAgICBpZihkYXJrU2t5RGF0YSAmJiBkYXJrU2t5RGF0YS5kYXRhICYmIGRhcmtTa3lEYXRhLmRhdGEuaG91cmx5ICYmIGRhcmtTa3lEYXRhLmRhdGEuaG91cmx5LmRhdGEpe1xuICAgICAgICBkYXJrU2t5RGF0YS5kYXRhLmhvdXJseS5kYXRhLmZvckVhY2goZGF0YT0+e1xuICAgICAgICAgIGRhcmtTa3lQYXJzZWREYXRhLnB1c2goe1xuICAgICAgICAgICAgdGVtcGVyYXR1cmU6ZGF0YS50ZW1wZXJhdHVyZSxcbiAgICAgICAgICAgIGh1bWlkaXR5OiBkYXRhLmh1bWlkaXR5KjEwMCxcbiAgICAgICAgICAgIGRhdGU6KG5ldyBEYXRlKGRhdGEudGltZSoxMDAwKSkuZ2V0VGltZSgpXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICAgIGlmKGRhcmtTa3lEYXRhICYmICBkYXJrU2t5RGF0YS5kYXRhICYmIGRhcmtTa3lEYXRhLmRhdGEuY3VycmVudGx5KXtcbiAgICAgICAgZGFya1NreVBhcnNlZEN1cnJlbnREYXRhID0ge1xuICAgICAgICAgIGRhdGU6IChuZXcgRGF0ZShkYXJrU2t5RGF0YS5kYXRhLmN1cnJlbnRseS50aW1lKjEwMDApKS5nZXRUaW1lKCksXG4gICAgICAgICAgdGVtcGVyYXR1cmU6IGRhcmtTa3lEYXRhLmRhdGEuY3VycmVudGx5LnRlbXBlcmF0dXJlLFxuICAgICAgICAgIGh1bWlkaXR5OiBkYXJrU2t5RGF0YS5kYXRhLmN1cnJlbnRseS5odW1pZGl0eSoxMDBcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZGFya1NreVBhcnNlZERhdGEuc29ydChmdW5jdGlvbihhLGIpIHtyZXR1cm4gKGEuZGF0ZSA+IGIuZGF0ZSkgPyAxIDogKChiLmRhdGUgPiBhLmRhdGUpID8gLTEgOiAwKTt9ICk7XG4gICAgICBjYWxsYmFjayh7XG4gICAgICAgIGhpc3RvcmljOiBkYXJrU2t5UGFyc2VkRGF0YSxcbiAgICAgICAgY3VycmVudDogZGFya1NreVBhcnNlZEN1cnJlbnREYXRhXG4gICAgICB9LHN0YXJ0RGF0ZSk7XG4gICAgLy99KTtcbiAgfSk7XG59XG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IEhUVFAgfSBmcm9tICdtZXRlb3IvaHR0cCc7XG5pbXBvcnQge3dlYXRoZXJTdGF0aW9ufSBmcm9tICcuL3dlYXRoZXJTdGF0aW9uLmpzJ1xuaW1wb3J0IHthcGl4dX0gZnJvbSAnLi9hcGl4dS5qcydcbmltcG9ydCB7ZGFya1NreX0gZnJvbSAnLi9kYXJrU2t5LmpzJ1xuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnXG5leHBvcnQge3Bvc3REYXRhTG9hZGVyfVxuXG5jb25zdCBjYWxsU2VydmljZSA9ICh0eXBlLCB1cmwsIG9wdGlvbnMpID0+IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgSFRUUC5jYWxsKHR5cGUsIHVybCwgb3B0aW9ucywgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIHJlamVjdChlcnJvcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICB9XG4gIH0pO1xufSk7XG5cbmZ1bmN0aW9uIGdldERpZmZWZWN0b3Iod2VhdGhlclN0YXRpb25EYXRhLGRhdGFWZWN0KXtcbiAgdmFyIGlUZW1wID0gMDtcbiAgdmFyIGlIdW1pZGl0eSA9IDA7XG4gIHZhciBkaWZmVGVtcCA9IFtdO1xuICB2YXIgZGlmZkh1bWlkaXR5ID0gW107XG4gIHZhciBkaWZmID0gW11cbiAgaWYoZGF0YVZlY3QuaGlzdG9yaWMpe1xuICAgIGRhdGFWZWN0Lmhpc3RvcmljLmZvckVhY2gocmVjb3JkPT57XG4gICAgICB2YXIgc3VtVGVtcGVyYXR1cmUgPSBudWxsO1xuICAgICAgdmFyIHN1bUh1bWlkaXR5ID0gbnVsbDtcbiAgICAgIHZhciBuVGVtcGVyYXR1cmUgPSAwO1xuICAgICAgdmFyIG5IdW1pZGl0eSA9IDA7XG4gICAgICB2YXIgYWN0dWFsVGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XG4gICAgICBpZihyZWNvcmQuZGF0ZTxhY3R1YWxUaW1lKVxuICAgICAge1xuICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGEuaGlzdG9yaWMpe1xuICAgICAgICAgIGZvcih2YXIgaT0wO2k8d2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljLmxlbmd0aDtpKyspXG4gICAgICAgICAge1xuICAgICAgICAgICAgdmFyIGRlbHRhID0gcmVjb3JkLmRhdGUtd2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljW2ldLmRhdGVcblxuICAgICAgICAgICAgaWYoZGVsdGE8MzYwMDAwMCAmJiBkZWx0YT4wKXtcbiAgICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljW2ldLnRlbXBlcmF0dXJlKVxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc3VtVGVtcGVyYXR1cmUgPSBzdW1UZW1wZXJhdHVyZSArIHdlYXRoZXJTdGF0aW9uRGF0YS5oaXN0b3JpY1tpXS50ZW1wZXJhdHVyZVxuICAgICAgICAgICAgICAgIG5UZW1wZXJhdHVyZSA9IG5UZW1wZXJhdHVyZSArIDE7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljW2ldLmh1bWlkaXR5KVxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgc3VtSHVtaWRpdHkgPSBzdW1IdW1pZGl0eSArIHdlYXRoZXJTdGF0aW9uRGF0YS5oaXN0b3JpY1tpXS5odW1pZGl0eVxuICAgICAgICAgICAgICAgIG5IdW1pZGl0eSA9IG5IdW1pZGl0eSArIDE7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1lbHNlIGlmKGRlbHRhIDwwKXtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmKHN1bVRlbXBlcmF0dXJlICYmIHN1bUh1bWlkaXR5KVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGRpZmYucHVzaCh7XG4gICAgICAgICAgICAgIGRhdGU6IHJlY29yZC5kYXRlLFxuICAgICAgICAgICAgICB0ZW1wZXJhdHVyZTogTWF0aC5hYnMoc3VtVGVtcGVyYXR1cmUvblRlbXBlcmF0dXJlIC0gcmVjb3JkLnRlbXBlcmF0dXJlKSxcbiAgICAgICAgICAgICAgaHVtaWRpdHk6IE1hdGguYWJzKHN1bUh1bWlkaXR5L25IdW1pZGl0eSAtIHJlY29yZC5odW1pZGl0eSlcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgIH0pXG4gIH1cbiAgcmV0dXJuIGRpZmZcbn1cblxuZnVuY3Rpb24gcG9zdERhdGFMb2FkZXIocHJvcHMsIG9uRGF0YSxlbnYpIHtcbiAgdmFyIGxvY2F0aW9uID0gZW52LmxvY2F0aW9uP2Vudi5sb2NhdGlvbjpcIjM4LjY3LC05LjJcIlxuICB2YXIgZGF0ZSA9IG5ldyBEYXRlKHByb3BzLm1hdGNoLnBhcmFtcy5kYXRlKS5nZXRUaW1lKCk7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgZC5zZXRIb3VycygwLDAsMCwwKTtcbiAgdmFyIG1pZG5pZ2h0ID0gZC5nZXRUaW1lKCk7XG4gIHZhciBzdGFydERhdGUgPSBkYXRlP2RhdGU6bWlkbmlnaHQ7XG5cbiAgLy8gbG9hZCBkYXRhIGZyb20gdGhlIHNlcnZlci4gKHVzaW5nIHByb3BzLmlkIHRvIGlkZW50aWZ5IHRoZSBwb3N0KVxuICAvLyAoSGVyZSdsbCB3ZSdsbCB1c2Ugc2V0VGltZW91dCBmb3IgZGVtb25zdHJhdGlvbiBwdXJwb3NlKVxuICB3ZWF0aGVyU3RhdGlvbihmdW5jdGlvbih3ZWF0aGVyU3RhdGlvbkRhdGEsc3RhcnREYXRlKXtcbiAgICBhcGl4dShmdW5jdGlvbihhcGl4dURhdGEsc3RhcnREYXRlKXtcbiAgICAgIGRhcmtTa3koZnVuY3Rpb24oZGFya1NreURhdGEsc3RhcnREYXRlKXtcbiAgICAgICAgYXBpeHVEYXRhLmRpZmYgPSBnZXREaWZmVmVjdG9yKHdlYXRoZXJTdGF0aW9uRGF0YSxhcGl4dURhdGEpXG4gICAgICAgIGRhcmtTa3lEYXRhLmRpZmYgPSBnZXREaWZmVmVjdG9yKHdlYXRoZXJTdGF0aW9uRGF0YSxkYXJrU2t5RGF0YSlcbiAgICAgICAgb25EYXRhKG51bGwsIHtcbiAgICAgICAgICB3ZWF0aGVyU3RhdGlvbjogd2VhdGhlclN0YXRpb25EYXRhLFxuICAgICAgICAgIGFwaXh1OiBhcGl4dURhdGEsXG4gICAgICAgICAgZGFya1NreTogZGFya1NreURhdGEsXG4gICAgICAgICAgc3RhcnREYXRlOiBtb21lbnQoc3RhcnREYXRlKS5mb3JtYXQoJ1lZWVktTU0tREQnKVxuICAgICAgICB9KVxuICAgICAgfSxzdGFydERhdGUsbG9jYXRpb24pO1xuICAgIH0sc3RhcnREYXRlLGxvY2F0aW9uKTtcbiAgfSxzdGFydERhdGUpXG59XG5pZihNZXRlb3IuaXNTZXJ2ZXIpe1xuICBNZXRlb3IubWV0aG9kcyh7XG4gICAgZ2V0UGFnZSh1cmwsb3B0aW9ucykge1xuICAgICAgcmV0dXJuIGNhbGxTZXJ2aWNlKFxuICAgICAgICAnR0VUJyxcbiAgICAgICAgdXJsLFxuICAgICAgICBvcHRpb25zXG4gICAgICApLnRoZW4oKHJlc3VsdCkgPT4gcmVzdWx0KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcignNTAwJywgYCR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gIH0pO1xufVxuIiwiZXhwb3J0IHt3ZWF0aGVyU3RhdGlvbn1cbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50J1xuZnVuY3Rpb24gd2VhdGhlclN0YXRpb24oY2FsbGJhY2ssc3RhcnREYXRlKXtcbiAgdmFyIGZvcm1hdGVkRGF0ZSA9IG1vbWVudChzdGFydERhdGUpLmZvcm1hdCgnWVlZWS1NTS1ERCcpXG4gIE1ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cDovL2VsYXN0aWNzZWFyY2gud2F6aXVwLmlvL3dheml1cC11aS13ZWF0aGVyL19zZWFyY2g/cT1uYW1lOldlYXRoZXJTdGF0aW9uVUkmc29ydD10aW1lOmRlc2Mmc2l6ZT02MDAwJnE9dGltZTonK2Zvcm1hdGVkRGF0ZSx7dGltZW91dDoxNTAwMH0sZnVuY3Rpb24oZXJyLHdlYXRoZXJTdGF0aW9uRGF0YSl7XG4gICAgLy9NZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHA6Ly9lbGFzdGljc2VhcmNoLndheml1cC5pby93YXppdXAtdWktd2VhdGhlci9fc2VhcmNoP3E9bmFtZTpXZWF0aGVyU3RhdGlvblVJJnNvcnQ9dGltZTpkZXNjJnNpemU9MScsZnVuY3Rpb24oZXJyLHdlYXRoZXJTdGF0aW9uRGF0YUxhc3Qpe1xuXG4gICAgICBNZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHA6Ly9icm9rZXIud2F6aXVwLmlvL3YyL2VudGl0aWVzL1dlYXRoZXJTdGF0aW9uVUknLHtcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgXCJGaXdhcmUtU2VydmljZVBhdGhcIjpcIi9VSS9XRUFUSEVSXCIsXG4gICAgICAgICAgICBcIkZpd2FyZS1TZXJ2aWNlXCI6XCJ3YXppdXBcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAgdGltZW91dDogMTUwMDBcbiAgICAgICAgfSxmdW5jdGlvbihlcnIsd2VhdGhlclN0YXRpb25EYXRhQ3VycmVudCl7XG4gICAgICAgICAgdmFyIFdTUGFyc2VkRGF0YSA9IFtdO1xuICAgICAgICAgIHZhciBXU0N1cnJlbnREYXRhID0ge31cbiAgICAgICAgICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgZC5zZXRIb3VycygwLDAsMCwwKTtcbiAgICAgICAgICB2YXIgbWlkbmlnaHQgPSBkLmdldFRpbWUoKTtcbiAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGEgJiYgd2VhdGhlclN0YXRpb25EYXRhLmRhdGEgJiYgd2VhdGhlclN0YXRpb25EYXRhLmRhdGEuaGl0cyAmJiB3ZWF0aGVyU3RhdGlvbkRhdGEuZGF0YS5oaXRzLmhpdHMgJiYgd2VhdGhlclN0YXRpb25EYXRhLmRhdGEuaGl0cy5oaXRzLmxlbmd0aCApXG4gICAgICAgICAge1xuICAgICAgICAgICAgd2VhdGhlclN0YXRpb25EYXRhLmRhdGEuaGl0cy5oaXRzLmZvckVhY2goaGl0PT57XG4gICAgICAgICAgICAgIGlmKChuZXcgRGF0ZShoaXQuX3NvdXJjZS50aW1lKSkuZ2V0VGltZSgpPm1pZG5pZ2h0LTM2MDAwMDAgfHwgdHJ1ZSl7XG4gICAgICAgICAgICAgICAgaWYoaGl0Ll9zb3VyY2UpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgaWYoaGl0Ll9zb3VyY2UuYXR0cmlidXRlPT1cIlRQXCIpXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFdTUGFyc2VkRGF0YS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICBkYXRlOihuZXcgRGF0ZShoaXQuX3NvdXJjZS50aW1lKSkuZ2V0VGltZSgpLFxuICAgICAgICAgICAgICAgICAgICAgIHRlbXBlcmF0dXJlOmhpdC5fc291cmNlLnZhbHVlXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZihoaXQuX3NvdXJjZS5hdHRyaWJ1dGU9PVwiSERcIilcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgV1NQYXJzZWREYXRhLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgIGRhdGU6KG5ldyBEYXRlKGhpdC5fc291cmNlLnRpbWUpKS5nZXRUaW1lKCksXG4gICAgICAgICAgICAgICAgICAgICAgaHVtaWRpdHk6aGl0Ll9zb3VyY2UudmFsdWVcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuICAgICAgICAgIFdTUGFyc2VkRGF0YS5zb3J0KGZ1bmN0aW9uKGEsYikge3JldHVybiAoYS5kYXRlID4gYi5kYXRlKSA/IDEgOiAoKGIuZGF0ZSA+IGEuZGF0ZSkgPyAtMSA6IDApO30gKTtcbiAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50ICYmIHdlYXRoZXJTdGF0aW9uRGF0YUN1cnJlbnQuZGF0YSlcbiAgICAgICAgICB7XG4gICAgICAgICAgICB2YXIgdGVtcGVyYXR1cmUgPSBudWxsO1xuICAgICAgICAgICAgZm9yKHZhciBpPVdTUGFyc2VkRGF0YS5sZW5ndGgtMTtpPjA7aS0tKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBpZihXU1BhcnNlZERhdGFbaV0udGVtcGVyYXR1cmUpe1xuICAgICAgICAgICAgICAgIHRlbXBlcmF0dXJlID0gV1NQYXJzZWREYXRhW2ldLnRlbXBlcmF0dXJlXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBodW1pZGl0eSA9IG51bGw7XG4gICAgICAgICAgICBmb3IodmFyIGk9V1NQYXJzZWREYXRhLmxlbmd0aC0xO2k+MDtpLS0pXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGlmKFdTUGFyc2VkRGF0YVtpXS5odW1pZGl0eSl7XG4gICAgICAgICAgICAgICAgaHVtaWRpdHkgPSBXU1BhcnNlZERhdGFbaV0uaHVtaWRpdHlcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhLlRQKXtcbiAgICAgICAgICAgICAgLy9XU0N1cnJlbnREYXRhLnRlbXBlcmF0dXJlID0gd2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhLlRQLnZhbHVlXG4gICAgICAgICAgICAgIFdTQ3VycmVudERhdGEudGVtcGVyYXR1cmUgPSB0ZW1wZXJhdHVyZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhLkhEKXtcbiAgICAgICAgICAgICAgLy9XU0N1cnJlbnREYXRhLmh1bWlkaXR5ID0gd2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhLkhELnZhbHVlXG4gICAgICAgICAgICAgIFdTQ3VycmVudERhdGEuaHVtaWRpdHkgPSBodW1pZGl0eVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGxhc3REYXRlID0gbnVsbDtcbiAgICAgICAgICAgIC8qaWYod2VhdGhlclN0YXRpb25EYXRhTGFzdCl7XG4gICAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YUxhc3QuZGF0YSl7XG4gICAgICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhTGFzdC5kYXRhLmhpdHMpe1xuICAgICAgICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhTGFzdC5kYXRhLmhpdHMuaGl0cyl7XG4gICAgICAgICAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YUxhc3QuZGF0YS5oaXRzLmhpdHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICBsYXN0RGF0ZSA9IHdlYXRoZXJTdGF0aW9uRGF0YUxhc3QuZGF0YS5oaXRzLmhpdHNbMF0uc29ydFswXVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9Ki9cbiAgICAgICAgICAgIGlmKFdTUGFyc2VkRGF0YS5sZW5ndGgpe1xuICAgICAgICAgICAgICBXU0N1cnJlbnREYXRhLmRhdGUgPSBXU1BhcnNlZERhdGFbV1NQYXJzZWREYXRhLmxlbmd0aC0xXS5kYXRlXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICB9XG4gICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgaGlzdG9yaWM6IFdTUGFyc2VkRGF0YSxcbiAgICAgICAgICAgIGN1cnJlbnQ6IFdTQ3VycmVudERhdGFcbiAgICAgICAgICB9LHN0YXJ0RGF0ZSk7XG4gICAgICB9KVxuICAgIC8vfSk7XG4gIH0pXG59XG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCAnLi4vaW1wb3J0cy9hcGkvZGF0YS5qcydcbk1ldGVvci5zdGFydHVwKCgpID0+IHtcbiAgLy8gY29kZSB0byBydW4gb24gc2VydmVyIGF0IHN0YXJ0dXBcbn0pO1xuIl19
