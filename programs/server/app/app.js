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
        var headerDate = weatherStationDataLast && weatherStationDataLast.headers && weatherStationDataLast.headers.date ? new Date(weatherStationDataLast.headers.date).getTime() : null;
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
          current: WSCurrentData,
          headerDate: headerDate
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvYXBpeHUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2RhcmtTa3kuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2RhdGEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL3dlYXRoZXJTdGF0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9zZXJ2ZXIvbWFpbi5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJhcGl4dSIsIm1vbWVudCIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwiY2FsbGJhY2siLCJzdGFydERhdGUiLCJjb25maWciLCJsb2NhdGlvbiIsImZvcm1hdGVkRGF0ZSIsImZvcm1hdCIsIk1ldGVvciIsImNhbGwiLCJ0aW1lb3V0IiwiZXJyIiwiYXBpeHVEYXRhIiwiYXBpeHVEYXRhQ3VycmVudCIsImFwaXh1UGFyc2VkRGF0YSIsImFwaXh1UGFyc2VkQ3VycmVudERhdGEiLCJkYXRhIiwiZm9yZWNhc3QiLCJmb3JlY2FzdGRheSIsImhvdXIiLCJmb3JFYWNoIiwicHVzaCIsInRlbXBlcmF0dXJlIiwidGVtcF9jIiwiaHVtaWRpdHkiLCJkYXRlIiwiRGF0ZSIsInRpbWVfZXBvY2giLCJnZXRUaW1lIiwiY3VycmVudCIsImxhc3RfdXBkYXRlZF9lcG9jaCIsInNvcnQiLCJhIiwiYiIsImhpc3RvcmljIiwiZGFya1NreSIsImN1cnJlbnRUaW1lIiwiTWF0aCIsInJvdW5kIiwiZGFya1NreURhdGEiLCJkYXJrU2t5RGF0YUxhc3QiLCJkYXJrU2t5UGFyc2VkRGF0YSIsImRhcmtTa3lQYXJzZWRDdXJyZW50RGF0YSIsImhvdXJseSIsInRpbWUiLCJjdXJyZW50bHkiLCJwb3N0RGF0YUxvYWRlciIsIkhUVFAiLCJ3ZWF0aGVyU3RhdGlvbiIsImNhbGxTZXJ2aWNlIiwidHlwZSIsInVybCIsIm9wdGlvbnMiLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsImVycm9yIiwicmVzdWx0IiwiZ2V0RGlmZlZlY3RvciIsIndlYXRoZXJTdGF0aW9uRGF0YSIsImRhdGFWZWN0IiwiaVRlbXAiLCJpSHVtaWRpdHkiLCJkaWZmVGVtcCIsImRpZmZIdW1pZGl0eSIsImRpZmYiLCJyZWNvcmQiLCJzdW1UZW1wZXJhdHVyZSIsInN1bUh1bWlkaXR5IiwiblRlbXBlcmF0dXJlIiwibkh1bWlkaXR5IiwiYWN0dWFsVGltZSIsImkiLCJsZW5ndGgiLCJkZWx0YSIsImFicyIsInByb3BzIiwib25EYXRhIiwiZW52IiwibWF0Y2giLCJwYXJhbXMiLCJkIiwic2V0SG91cnMiLCJtaWRuaWdodCIsImlzU2VydmVyIiwibWV0aG9kcyIsImdldFBhZ2UiLCJ0aGVuIiwiY2F0Y2giLCJFcnJvciIsIm1lc3NhZ2UiLCJlbGFzdGljc2VhcmNoVXJsIiwiZWxhc3RpY3NlYXJjaFNlYXJjaFF1ZXJ5IiwiYnJva2VyVXJsIiwiZml3YXJlU2VydmljZVBhdGgiLCJmaXdhcmVTZXJ2aWNlIiwid2VhdGhlclN0YXRpb25EYXRhTGFzdCIsImhlYWRlcnMiLCJ3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50IiwiaGVhZGVyRGF0ZSIsIldTUGFyc2VkRGF0YSIsIldTQ3VycmVudERhdGEiLCJoaXRzIiwiaGl0IiwiX3NvdXJjZSIsImF0dHJpYnV0ZSIsInZhbHVlIiwiVFAiLCJIRCIsImxhc3REYXRlIiwic3RhcnR1cCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQUEsT0FBT0MsTUFBUCxDQUFjO0FBQUNDLFNBQU0sTUFBSUE7QUFBWCxDQUFkO0FBQWlDLElBQUlDLE1BQUo7QUFBV0gsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLFFBQVIsQ0FBYixFQUErQjtBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0osYUFBT0ksQ0FBUDtBQUFTOztBQUFyQixDQUEvQixFQUFzRCxDQUF0RDs7QUFFNUMsU0FBU0wsS0FBVCxDQUFlTSxRQUFmLEVBQXdCQyxTQUF4QixFQUFrQ0MsTUFBbEMs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LCJmaWxlIjoiL2FwcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCB7YXBpeHV9XG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCdcbmZ1bmN0aW9uIGFwaXh1KGNhbGxiYWNrLHN0YXJ0RGF0ZSxjb25maWcpe1xuICB2YXIgbG9jYXRpb24gPSBjb25maWcgJiYgY29uZmlnLmxvY2F0aW9uP2NvbmZpZy5sb2NhdGlvbjpcIjM4LjY3LC05LjJcIjtcbiAgdmFyIGZvcm1hdGVkRGF0ZSA9IG1vbWVudChzdGFydERhdGUpLmZvcm1hdCgnWVlZWS1NTS1ERCcpXG4gIE1ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cDovL2FwaS5hcGl4dS5jb20vdjEvaGlzdG9yeS5qc29uP2tleT0wNWQ3MjU5OWJlZDk0NmQ4OTgzMTU1MDE1MTcwNTEyJnE9Jytsb2NhdGlvbisnJmR0PScrZm9ybWF0ZWREYXRlLHt0aW1lb3V0OjE1MDAwfSxmdW5jdGlvbihlcnIsYXBpeHVEYXRhKXtcbiAgICBNZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHA6Ly9hcGkuYXBpeHUuY29tL3YxL2N1cnJlbnQuanNvbj9rZXk9MDVkNzI1OTliZWQ5NDZkODk4MzE1NTAxNTE3MDUxMiZxPScrbG9jYXRpb24se3RpbWVvdXQ6MTUwMDB9LGZ1bmN0aW9uKGVycixhcGl4dURhdGFDdXJyZW50KXtcbiAgICAgIHZhciBhcGl4dVBhcnNlZERhdGEgPSBbXTtcbiAgICAgIHZhciBhcGl4dVBhcnNlZEN1cnJlbnREYXRhID0ge307XG4gICAgICBpZihhcGl4dURhdGEgJiYgYXBpeHVEYXRhLmRhdGEgJiYgYXBpeHVEYXRhLmRhdGEuZm9yZWNhc3QgJiYgYXBpeHVEYXRhLmRhdGEuZm9yZWNhc3QuZm9yZWNhc3RkYXkgJiYgIGFwaXh1RGF0YS5kYXRhLmZvcmVjYXN0LmZvcmVjYXN0ZGF5WzBdICYmIGFwaXh1RGF0YS5kYXRhLmZvcmVjYXN0LmZvcmVjYXN0ZGF5WzBdLmhvdXIpe1xuXG4gICAgICAgIGFwaXh1RGF0YS5kYXRhLmZvcmVjYXN0LmZvcmVjYXN0ZGF5WzBdLmhvdXIuZm9yRWFjaChob3VyPT57XG4gICAgICAgICAgYXBpeHVQYXJzZWREYXRhLnB1c2goe1xuICAgICAgICAgICAgdGVtcGVyYXR1cmU6aG91ci50ZW1wX2MsXG4gICAgICAgICAgICBodW1pZGl0eTogaG91ci5odW1pZGl0eSxcbiAgICAgICAgICAgIGRhdGU6KG5ldyBEYXRlKGhvdXIudGltZV9lcG9jaCoxMDAwKSkuZ2V0VGltZSgpXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcblxuXG4gICAgICB9XG4gICAgICBpZihhcGl4dURhdGFDdXJyZW50ICYmIGFwaXh1RGF0YUN1cnJlbnQuZGF0YSAmJiBhcGl4dURhdGFDdXJyZW50LmRhdGEuY3VycmVudCl7XG4gICAgICAgIGFwaXh1UGFyc2VkQ3VycmVudERhdGEgPSB7XG4gICAgICAgICAgZGF0ZTogKG5ldyBEYXRlKGFwaXh1RGF0YUN1cnJlbnQuZGF0YS5jdXJyZW50Lmxhc3RfdXBkYXRlZF9lcG9jaCoxMDAwKSkuZ2V0VGltZSgpLFxuICAgICAgICAgIHRlbXBlcmF0dXJlOiBhcGl4dURhdGFDdXJyZW50LmRhdGEuY3VycmVudC50ZW1wX2MsXG4gICAgICAgICAgaHVtaWRpdHk6IGFwaXh1RGF0YUN1cnJlbnQuZGF0YS5jdXJyZW50Lmh1bWlkaXR5XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFwaXh1UGFyc2VkRGF0YS5zb3J0KGZ1bmN0aW9uKGEsYikge3JldHVybiAoYS5kYXRlID4gYi5kYXRlKSA/IDEgOiAoKGIuZGF0ZSA+IGEuZGF0ZSkgPyAtMSA6IDApO30gKTtcbiAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgaGlzdG9yaWM6IGFwaXh1UGFyc2VkRGF0YSxcbiAgICAgICAgY3VycmVudDogYXBpeHVQYXJzZWRDdXJyZW50RGF0YVxuICAgICAgfSxzdGFydERhdGUpO1xuICAgIH0pO1xuICB9KTtcbn1cbiIsImV4cG9ydCB7ZGFya1NreX1cblxuZnVuY3Rpb24gZGFya1NreShjYWxsYmFjayxzdGFydERhdGUsY29uZmlnKXtcblxuICB2YXIgbG9jYXRpb24gPSBjb25maWcgJiYgY29uZmlnLmxvY2F0aW9uID9jb25maWcubG9jYXRpb246XCIzOC42NywtOS4yXCI7XG4gIHZhciBjdXJyZW50VGltZSA9IE1hdGgucm91bmQoKG5ldyBEYXRlKHN0YXJ0RGF0ZSkpLmdldFRpbWUoKS8xMDAwKVxuICBNZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHBzOi8vYXBpLmRhcmtza3kubmV0L2ZvcmVjYXN0Lzc5MDJkNjhmMGI1NjQ4Y2NlN2I5YjEyMTM5NDUxOTc0LycrbG9jYXRpb24rJywnK2N1cnJlbnRUaW1lKyc/dW5pdHM9c2knLHt0aW1lb3V0OjE1MDAwfSxmdW5jdGlvbihlcnIsZGFya1NreURhdGEpe1xuICAgIE1ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cHM6Ly9hcGkuZGFya3NreS5uZXQvZm9yZWNhc3QvNzkwMmQ2OGYwYjU2NDhjY2U3YjliMTIxMzk0NTE5NzQvJytsb2NhdGlvbisnP3VuaXRzPXNpJyx7dGltZW91dDoxNTAwMH0sZnVuY3Rpb24oZXJyLGRhcmtTa3lEYXRhTGFzdCl7XG5cbiAgICAvL01ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cDovL3d3dy5zYXBvLnB0JyxmdW5jdGlvbihlcnIsZGFya1NreURhdGEpe1xuICAgICAgdmFyIGRhcmtTa3lQYXJzZWREYXRhID0gW107XG4gICAgICB2YXIgZGFya1NreVBhcnNlZEN1cnJlbnREYXRhID0ge31cbiAgICAgIGlmKGRhcmtTa3lEYXRhICYmIGRhcmtTa3lEYXRhLmRhdGEgJiYgZGFya1NreURhdGEuZGF0YS5ob3VybHkgJiYgZGFya1NreURhdGEuZGF0YS5ob3VybHkuZGF0YSl7XG4gICAgICAgIGRhcmtTa3lEYXRhLmRhdGEuaG91cmx5LmRhdGEuZm9yRWFjaChkYXRhPT57XG4gICAgICAgICAgZGFya1NreVBhcnNlZERhdGEucHVzaCh7XG4gICAgICAgICAgICB0ZW1wZXJhdHVyZTpkYXRhLnRlbXBlcmF0dXJlLFxuICAgICAgICAgICAgaHVtaWRpdHk6IGRhdGEuaHVtaWRpdHkqMTAwLFxuICAgICAgICAgICAgZGF0ZToobmV3IERhdGUoZGF0YS50aW1lKjEwMDApKS5nZXRUaW1lKClcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgaWYoZGFya1NreURhdGFMYXN0ICYmICBkYXJrU2t5RGF0YUxhc3QuZGF0YSAmJiBkYXJrU2t5RGF0YUxhc3QuZGF0YS5jdXJyZW50bHkpe1xuICAgICAgICBkYXJrU2t5UGFyc2VkQ3VycmVudERhdGEgPSB7XG4gICAgICAgICAgZGF0ZTogKG5ldyBEYXRlKGRhcmtTa3lEYXRhTGFzdC5kYXRhLmN1cnJlbnRseS50aW1lKjEwMDApKS5nZXRUaW1lKCksXG4gICAgICAgICAgdGVtcGVyYXR1cmU6IGRhcmtTa3lEYXRhTGFzdC5kYXRhLmN1cnJlbnRseS50ZW1wZXJhdHVyZSxcbiAgICAgICAgICBodW1pZGl0eTogZGFya1NreURhdGFMYXN0LmRhdGEuY3VycmVudGx5Lmh1bWlkaXR5KjEwMFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBkYXJrU2t5UGFyc2VkRGF0YS5zb3J0KGZ1bmN0aW9uKGEsYikge3JldHVybiAoYS5kYXRlID4gYi5kYXRlKSA/IDEgOiAoKGIuZGF0ZSA+IGEuZGF0ZSkgPyAtMSA6IDApO30gKTtcbiAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgaGlzdG9yaWM6IGRhcmtTa3lQYXJzZWREYXRhLFxuICAgICAgICBjdXJyZW50OiBkYXJrU2t5UGFyc2VkQ3VycmVudERhdGFcbiAgICAgIH0sc3RhcnREYXRlKTtcbiAgICB9KTtcbiAgfSk7XG59XG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IEhUVFAgfSBmcm9tICdtZXRlb3IvaHR0cCc7XG5pbXBvcnQge3dlYXRoZXJTdGF0aW9ufSBmcm9tICcuL3dlYXRoZXJTdGF0aW9uLmpzJ1xuaW1wb3J0IHthcGl4dX0gZnJvbSAnLi9hcGl4dS5qcydcbmltcG9ydCB7ZGFya1NreX0gZnJvbSAnLi9kYXJrU2t5LmpzJ1xuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnXG5leHBvcnQge3Bvc3REYXRhTG9hZGVyfVxuXG5jb25zdCBjYWxsU2VydmljZSA9ICh0eXBlLCB1cmwsIG9wdGlvbnMpID0+IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgSFRUUC5jYWxsKHR5cGUsIHVybCwgb3B0aW9ucywgKGVycm9yLCByZXN1bHQpID0+IHtcbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIHJlamVjdChlcnJvcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICB9XG4gIH0pO1xufSk7XG5cbmZ1bmN0aW9uIGdldERpZmZWZWN0b3Iod2VhdGhlclN0YXRpb25EYXRhLGRhdGFWZWN0KXtcbiAgdmFyIGlUZW1wID0gMDtcbiAgdmFyIGlIdW1pZGl0eSA9IDA7XG4gIHZhciBkaWZmVGVtcCA9IFtdO1xuICB2YXIgZGlmZkh1bWlkaXR5ID0gW107XG4gIHZhciBkaWZmID0gW11cbiAgaWYoZGF0YVZlY3QuaGlzdG9yaWMpe1xuICAgIGRhdGFWZWN0Lmhpc3RvcmljLmZvckVhY2gocmVjb3JkPT57XG4gICAgICB2YXIgc3VtVGVtcGVyYXR1cmUgPSBudWxsO1xuICAgICAgdmFyIHN1bUh1bWlkaXR5ID0gbnVsbDtcbiAgICAgIHZhciBuVGVtcGVyYXR1cmUgPSAwO1xuICAgICAgdmFyIG5IdW1pZGl0eSA9IDA7XG4gICAgICB2YXIgYWN0dWFsVGltZSA9IChuZXcgRGF0ZSgpKS5nZXRUaW1lKCk7XG4gICAgICBpZihyZWNvcmQuZGF0ZTxhY3R1YWxUaW1lKVxuICAgICAge1xuICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGEuaGlzdG9yaWMpe1xuICAgICAgICAgIGZvcih2YXIgaT0wO2k8d2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljLmxlbmd0aDtpKyspXG4gICAgICAgICAge1xuICAgICAgICAgICAgdmFyIGRlbHRhID0gcmVjb3JkLmRhdGUtd2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljW2ldLmRhdGVcblxuICAgICAgICAgICAgaWYoZGVsdGE8MzYwMDAwMCl7XG4gICAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YS5oaXN0b3JpY1tpXS50ZW1wZXJhdHVyZSlcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHN1bVRlbXBlcmF0dXJlID0gc3VtVGVtcGVyYXR1cmUgKyB3ZWF0aGVyU3RhdGlvbkRhdGEuaGlzdG9yaWNbaV0udGVtcGVyYXR1cmVcbiAgICAgICAgICAgICAgICBuVGVtcGVyYXR1cmUgPSBuVGVtcGVyYXR1cmUgKyAxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YS5oaXN0b3JpY1tpXS5odW1pZGl0eSlcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHN1bUh1bWlkaXR5ID0gc3VtSHVtaWRpdHkgKyB3ZWF0aGVyU3RhdGlvbkRhdGEuaGlzdG9yaWNbaV0uaHVtaWRpdHlcbiAgICAgICAgICAgICAgICBuSHVtaWRpdHkgPSBuSHVtaWRpdHkgKyAxO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9ZWxzZSBpZihkZWx0YSA8MCl7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZihzdW1UZW1wZXJhdHVyZSAmJiBzdW1IdW1pZGl0eSlcbiAgICAgICAgICB7XG5cbiAgICAgICAgICAgIGRpZmYucHVzaCh7XG4gICAgICAgICAgICAgIGRhdGU6IHJlY29yZC5kYXRlLFxuICAgICAgICAgICAgICB0ZW1wZXJhdHVyZTogTWF0aC5hYnMoc3VtVGVtcGVyYXR1cmUvblRlbXBlcmF0dXJlIC0gcmVjb3JkLnRlbXBlcmF0dXJlKSxcbiAgICAgICAgICAgICAgaHVtaWRpdHk6IE1hdGguYWJzKHN1bUh1bWlkaXR5L25IdW1pZGl0eSAtIHJlY29yZC5odW1pZGl0eSlcbiAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgIH0pXG4gIH1cbiAgcmV0dXJuIGRpZmZcbn1cblxuZnVuY3Rpb24gcG9zdERhdGFMb2FkZXIocHJvcHMsIG9uRGF0YSxlbnYpIHtcbiAgdmFyIGNvbmZpZyA9IGVudi5jb25maWc/ZW52LmNvbmZpZzp7fVxuICB2YXIgZGF0ZSA9IG5ldyBEYXRlKHByb3BzLm1hdGNoLnBhcmFtcy5kYXRlKS5nZXRUaW1lKCk7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgZC5zZXRIb3VycygwLDAsMCwwKTtcbiAgdmFyIG1pZG5pZ2h0ID0gZC5nZXRUaW1lKCk7XG4gIHZhciBzdGFydERhdGUgPSBkYXRlP2RhdGU6bWlkbmlnaHQ7XG5cbiAgLy8gbG9hZCBkYXRhIGZyb20gdGhlIHNlcnZlci4gKHVzaW5nIHByb3BzLmlkIHRvIGlkZW50aWZ5IHRoZSBwb3N0KVxuICAvLyAoSGVyZSdsbCB3ZSdsbCB1c2Ugc2V0VGltZW91dCBmb3IgZGVtb25zdHJhdGlvbiBwdXJwb3NlKVxuICB3ZWF0aGVyU3RhdGlvbihmdW5jdGlvbih3ZWF0aGVyU3RhdGlvbkRhdGEsc3RhcnREYXRlKXtcbiAgICBhcGl4dShmdW5jdGlvbihhcGl4dURhdGEsc3RhcnREYXRlKXtcbiAgICAgIGRhcmtTa3koZnVuY3Rpb24oZGFya1NreURhdGEsc3RhcnREYXRlKXtcbiAgICAgICAgYXBpeHVEYXRhLmRpZmYgPSBnZXREaWZmVmVjdG9yKHdlYXRoZXJTdGF0aW9uRGF0YSxhcGl4dURhdGEpXG4gICAgICAgIGRhcmtTa3lEYXRhLmRpZmYgPSBnZXREaWZmVmVjdG9yKHdlYXRoZXJTdGF0aW9uRGF0YSxkYXJrU2t5RGF0YSlcbiAgICAgICAgb25EYXRhKG51bGwsIHtcbiAgICAgICAgICB3ZWF0aGVyU3RhdGlvbjogd2VhdGhlclN0YXRpb25EYXRhLFxuICAgICAgICAgIGFwaXh1OiBhcGl4dURhdGEsXG4gICAgICAgICAgZGFya1NreTogZGFya1NreURhdGEsXG4gICAgICAgICAgc3RhcnREYXRlOiBtb21lbnQoc3RhcnREYXRlKS5mb3JtYXQoJ1lZWVktTU0tREQnKVxuICAgICAgICB9KVxuICAgICAgfSxzdGFydERhdGUsY29uZmlnKTtcbiAgICB9LHN0YXJ0RGF0ZSxjb25maWcpO1xuICB9LHN0YXJ0RGF0ZSxjb25maWcpXG59XG5pZihNZXRlb3IuaXNTZXJ2ZXIpe1xuICBNZXRlb3IubWV0aG9kcyh7XG4gICAgZ2V0UGFnZSh1cmwsb3B0aW9ucykge1xuICAgICAgcmV0dXJuIGNhbGxTZXJ2aWNlKFxuICAgICAgICAnR0VUJyxcbiAgICAgICAgdXJsLFxuICAgICAgICBvcHRpb25zXG4gICAgICApLnRoZW4oKHJlc3VsdCkgPT4gcmVzdWx0KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcignNTAwJywgYCR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gIH0pO1xufVxuIiwiZXhwb3J0IHt3ZWF0aGVyU3RhdGlvbn1cbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50J1xuZnVuY3Rpb24gd2VhdGhlclN0YXRpb24oY2FsbGJhY2ssc3RhcnREYXRlLGNvbmZpZyl7XG4gIHZhciBlbGFzdGljc2VhcmNoVXJsID0gY29uZmlnICYmIGNvbmZpZy5lbGFzdGljc2VhcmNoVXJsP2NvbmZpZy5lbGFzdGljc2VhcmNoVXJsOlwiXCJcbiAgdmFyIGVsYXN0aWNzZWFyY2hTZWFyY2hRdWVyeSA9IGNvbmZpZyAmJiBjb25maWcuZWxhc3RpY3NlYXJjaFNlYXJjaFF1ZXJ5P2NvbmZpZy5lbGFzdGljc2VhcmNoU2VhcmNoUXVlcnk6XCJcIlxuICB2YXIgYnJva2VyVXJsID0gY29uZmlnICYmIGNvbmZpZy5icm9rZXJVcmw/Y29uZmlnLmJyb2tlclVybDpcIlwiXG4gIHZhciBmaXdhcmVTZXJ2aWNlUGF0aCA9IGNvbmZpZyAmJiBjb25maWcuZml3YXJlU2VydmljZVBhdGg/Y29uZmlnLmZpd2FyZVNlcnZpY2VQYXRoOlwiXCJcbiAgdmFyIGZpd2FyZVNlcnZpY2UgPSBjb25maWcgJiYgY29uZmlnLmZpd2FyZVNlcnZpY2U/Y29uZmlnLmZpd2FyZVNlcnZpY2U6XCJcIlxuXG4gIHZhciBmb3JtYXRlZERhdGUgPSBtb21lbnQoc3RhcnREYXRlKS5mb3JtYXQoJ1lZWVktTU0tREQnKVxuICBNZXRlb3IuY2FsbCgnZ2V0UGFnZScsIGVsYXN0aWNzZWFyY2hVcmwgKyAnP3E9JytlbGFzdGljc2VhcmNoU2VhcmNoUXVlcnkrJyZzb3J0PXRpbWU6ZGVzYyZzaXplPTYwMDAmcT10aW1lOicrZm9ybWF0ZWREYXRlLHt0aW1lb3V0OjE1MDAwfSxmdW5jdGlvbihlcnIsd2VhdGhlclN0YXRpb25EYXRhKXtcbiAgICBNZXRlb3IuY2FsbCgnZ2V0UGFnZScsZWxhc3RpY3NlYXJjaFVybCArICc/cT0nK2VsYXN0aWNzZWFyY2hTZWFyY2hRdWVyeSsnJnNvcnQ9dGltZTpkZXNjJnNpemU9MScse3RpbWVvdXQ6MTUwMDB9LGZ1bmN0aW9uKGVycix3ZWF0aGVyU3RhdGlvbkRhdGFMYXN0KXtcbiAgICAgIE1ldGVvci5jYWxsKCdnZXRQYWdlJyxicm9rZXJVcmwse1xuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICBcIkZpd2FyZS1TZXJ2aWNlUGF0aFwiOmZpd2FyZVNlcnZpY2VQYXRoLFxuICAgICAgICAgICAgXCJGaXdhcmUtU2VydmljZVwiOmZpd2FyZVNlcnZpY2VcbiAgICAgICAgICB9LFxuICAgICAgICAgIHRpbWVvdXQ6IDE1MDAwXG4gICAgICAgIH0sZnVuY3Rpb24oZXJyLHdlYXRoZXJTdGF0aW9uRGF0YUN1cnJlbnQpe1xuICAgICAgICAgIHZhciBoZWFkZXJEYXRlID0gd2VhdGhlclN0YXRpb25EYXRhTGFzdCAmJiB3ZWF0aGVyU3RhdGlvbkRhdGFMYXN0LmhlYWRlcnMgJiYgd2VhdGhlclN0YXRpb25EYXRhTGFzdC5oZWFkZXJzLmRhdGU/KG5ldyBEYXRlKHdlYXRoZXJTdGF0aW9uRGF0YUxhc3QuaGVhZGVycy5kYXRlKSkuZ2V0VGltZSgpOm51bGw7XG4gICAgICAgICAgdmFyIFdTUGFyc2VkRGF0YSA9IFtdO1xuICAgICAgICAgIHZhciBXU0N1cnJlbnREYXRhID0ge31cbiAgICAgICAgICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgZC5zZXRIb3VycygwLDAsMCwwKTtcbiAgICAgICAgICB2YXIgbWlkbmlnaHQgPSBkLmdldFRpbWUoKTtcbiAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGEgJiYgd2VhdGhlclN0YXRpb25EYXRhLmRhdGEgJiYgd2VhdGhlclN0YXRpb25EYXRhLmRhdGEuaGl0cyAmJiB3ZWF0aGVyU3RhdGlvbkRhdGEuZGF0YS5oaXRzLmhpdHMgJiYgd2VhdGhlclN0YXRpb25EYXRhLmRhdGEuaGl0cy5oaXRzLmxlbmd0aCApXG4gICAgICAgICAge1xuICAgICAgICAgICAgd2VhdGhlclN0YXRpb25EYXRhLmRhdGEuaGl0cy5oaXRzLmZvckVhY2goaGl0PT57XG4gICAgICAgICAgICAgIGlmKChuZXcgRGF0ZShoaXQuX3NvdXJjZS50aW1lKSkuZ2V0VGltZSgpPm1pZG5pZ2h0LTM2MDAwMDAgfHwgdHJ1ZSl7XG4gICAgICAgICAgICAgICAgaWYoaGl0Ll9zb3VyY2UpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgaWYoaGl0Ll9zb3VyY2UuYXR0cmlidXRlPT1cIlRQXCIpXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFdTUGFyc2VkRGF0YS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICBkYXRlOihuZXcgRGF0ZShoaXQuX3NvdXJjZS50aW1lKSkuZ2V0VGltZSgpLFxuICAgICAgICAgICAgICAgICAgICAgIHRlbXBlcmF0dXJlOmhpdC5fc291cmNlLnZhbHVlXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZihoaXQuX3NvdXJjZS5hdHRyaWJ1dGU9PVwiSERcIilcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgV1NQYXJzZWREYXRhLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgIGRhdGU6KG5ldyBEYXRlKGhpdC5fc291cmNlLnRpbWUpKS5nZXRUaW1lKCksXG4gICAgICAgICAgICAgICAgICAgICAgaHVtaWRpdHk6aGl0Ll9zb3VyY2UudmFsdWVcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuICAgICAgICAgIFdTUGFyc2VkRGF0YS5zb3J0KGZ1bmN0aW9uKGEsYikge3JldHVybiAoYS5kYXRlID4gYi5kYXRlKSA/IDEgOiAoKGIuZGF0ZSA+IGEuZGF0ZSkgPyAtMSA6IDApO30gKTtcbiAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50ICYmIHdlYXRoZXJTdGF0aW9uRGF0YUN1cnJlbnQuZGF0YSlcbiAgICAgICAgICB7XG4gICAgICAgICAgICB2YXIgdGVtcGVyYXR1cmUgPSBudWxsO1xuICAgICAgICAgICAgZm9yKHZhciBpPVdTUGFyc2VkRGF0YS5sZW5ndGgtMTtpPjA7aS0tKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBpZihXU1BhcnNlZERhdGFbaV0udGVtcGVyYXR1cmUpe1xuICAgICAgICAgICAgICAgIHRlbXBlcmF0dXJlID0gV1NQYXJzZWREYXRhW2ldLnRlbXBlcmF0dXJlXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBodW1pZGl0eSA9IG51bGw7XG4gICAgICAgICAgICBmb3IodmFyIGk9V1NQYXJzZWREYXRhLmxlbmd0aC0xO2k+MDtpLS0pXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGlmKFdTUGFyc2VkRGF0YVtpXS5odW1pZGl0eSl7XG4gICAgICAgICAgICAgICAgaHVtaWRpdHkgPSBXU1BhcnNlZERhdGFbaV0uaHVtaWRpdHlcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhLlRQKXtcbiAgICAgICAgICAgICAgV1NDdXJyZW50RGF0YS50ZW1wZXJhdHVyZSA9IHdlYXRoZXJTdGF0aW9uRGF0YUN1cnJlbnQuZGF0YS5UUC52YWx1ZVxuICAgICAgICAgICAgICAvL1dTQ3VycmVudERhdGEudGVtcGVyYXR1cmUgPSB0ZW1wZXJhdHVyZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhLkhEKXtcbiAgICAgICAgICAgICAgV1NDdXJyZW50RGF0YS5odW1pZGl0eSA9IHdlYXRoZXJTdGF0aW9uRGF0YUN1cnJlbnQuZGF0YS5IRC52YWx1ZVxuICAgICAgICAgICAgICAvL1dTQ3VycmVudERhdGEuaHVtaWRpdHkgPSBodW1pZGl0eVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGxhc3REYXRlID0gbnVsbDtcbiAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YUxhc3QgJiYgd2VhdGhlclN0YXRpb25EYXRhTGFzdC5kYXRhICYmIHdlYXRoZXJTdGF0aW9uRGF0YUxhc3QuZGF0YS5oaXRzICYmIHdlYXRoZXJTdGF0aW9uRGF0YUxhc3QuZGF0YS5oaXRzLmhpdHMgJiYgd2VhdGhlclN0YXRpb25EYXRhTGFzdC5kYXRhLmhpdHMuaGl0cy5sZW5ndGgpe1xuICAgICAgICAgICAgICBsYXN0RGF0ZSA9IHdlYXRoZXJTdGF0aW9uRGF0YUxhc3QuZGF0YS5oaXRzLmhpdHNbMF0uc29ydFswXVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYoV1NQYXJzZWREYXRhLmxlbmd0aCl7XG4gICAgICAgICAgICAgIFdTQ3VycmVudERhdGEuZGF0ZSA9IGxhc3REYXRlXG4gICAgICAgICAgICAgIC8vV1NDdXJyZW50RGF0YS5kYXRlID0gV1NQYXJzZWREYXRhW1dTUGFyc2VkRGF0YS5sZW5ndGgtMV0uZGF0ZVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgfVxuICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgIGhpc3RvcmljOiBXU1BhcnNlZERhdGEsXG4gICAgICAgICAgICBjdXJyZW50OiBXU0N1cnJlbnREYXRhLFxuICAgICAgICAgICAgaGVhZGVyRGF0ZTogaGVhZGVyRGF0ZVxuICAgICAgICAgIH0sc3RhcnREYXRlKTtcbiAgICAgIH0pXG4gICAgfSk7XG4gIH0pXG59XG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCAnLi4vaW1wb3J0cy9hcGkvZGF0YS5qcydcbk1ldGVvci5zdGFydHVwKCgpID0+IHtcbiAgLy8gY29kZSB0byBydW4gb24gc2VydmVyIGF0IHN0YXJ0dXBcblxufSk7XG4iXX0=
