var require = meteorInstall({"imports":{"api":{"apixu.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/api/apixu.js                                                                                             //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
  Meteor.call('getPage', 'http://api.apixu.com/v1/history.json?key=05d72599bed946d8983155015170512&q=Caparica&dt=' + formatedDate, {
    timeout: 15000
  }, function (err, apixuData) {
    Meteor.call('getPage', 'http://api.apixu.com/v1/current.json?key=05d72599bed946d8983155015170512&q=Caparica', {
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"darkSky.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/api/darkSky.js                                                                                           //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
module.export({
  darkSky: () => darkSky
});

function darkSky(callback, startDate) {
  var currentTime = Math.round(new Date(startDate).getTime() / 1000);
  Meteor.call('getPage', 'https://api.darksky.net/forecast/7902d68f0b5648cce7b9b12139451974/38.67,-9.2,' + currentTime + '?units=si', {
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"data.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/api/data.js                                                                                              //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"weatherStation.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// imports/api/weatherStation.js                                                                                    //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"server":{"main.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// server/main.js                                                                                                   //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json",
    ".jsx"
  ]
});
require("./server/main.js");
//# sourceURL=meteor://💻app/app/app.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvYXBpeHUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2RhcmtTa3kuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL2RhdGEuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL2ltcG9ydHMvYXBpL3dlYXRoZXJTdGF0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9zZXJ2ZXIvbWFpbi5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJhcGl4dSIsIm1vbWVudCIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwiY2FsbGJhY2siLCJzdGFydERhdGUiLCJmb3JtYXRlZERhdGUiLCJmb3JtYXQiLCJNZXRlb3IiLCJjYWxsIiwidGltZW91dCIsImVyciIsImFwaXh1RGF0YSIsImFwaXh1RGF0YUN1cnJlbnQiLCJhcGl4dVBhcnNlZERhdGEiLCJhcGl4dVBhcnNlZEN1cnJlbnREYXRhIiwiZGF0YSIsImZvcmVjYXN0IiwiZm9yZWNhc3RkYXkiLCJob3VyIiwiZm9yRWFjaCIsInB1c2giLCJ0ZW1wZXJhdHVyZSIsInRlbXBfYyIsImh1bWlkaXR5IiwiZGF0ZSIsIkRhdGUiLCJ0aW1lX2Vwb2NoIiwiZ2V0VGltZSIsImN1cnJlbnQiLCJsYXN0X3VwZGF0ZWRfZXBvY2giLCJzb3J0IiwiYSIsImIiLCJoaXN0b3JpYyIsImRhcmtTa3kiLCJjdXJyZW50VGltZSIsIk1hdGgiLCJyb3VuZCIsImRhcmtTa3lEYXRhIiwiZGFya1NreVBhcnNlZERhdGEiLCJkYXJrU2t5UGFyc2VkQ3VycmVudERhdGEiLCJob3VybHkiLCJ0aW1lIiwiY3VycmVudGx5IiwicG9zdERhdGFMb2FkZXIiLCJIVFRQIiwid2VhdGhlclN0YXRpb24iLCJjYWxsU2VydmljZSIsInR5cGUiLCJ1cmwiLCJvcHRpb25zIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJlcnJvciIsInJlc3VsdCIsImdldERpZmZWZWN0b3IiLCJ3ZWF0aGVyU3RhdGlvbkRhdGEiLCJkYXRhVmVjdCIsImlUZW1wIiwiaUh1bWlkaXR5IiwiZGlmZlRlbXAiLCJkaWZmSHVtaWRpdHkiLCJkaWZmIiwicmVjb3JkIiwic3VtVGVtcGVyYXR1cmUiLCJzdW1IdW1pZGl0eSIsIm5UZW1wZXJhdHVyZSIsIm5IdW1pZGl0eSIsImFjdHVhbFRpbWUiLCJpIiwibGVuZ3RoIiwiZGVsdGEiLCJhYnMiLCJwcm9wcyIsIm9uRGF0YSIsImUiLCJtYXRjaCIsInBhcmFtcyIsImQiLCJzZXRIb3VycyIsIm1pZG5pZ2h0IiwiaXNTZXJ2ZXIiLCJtZXRob2RzIiwiZ2V0UGFnZSIsInRoZW4iLCJjYXRjaCIsIkVycm9yIiwibWVzc2FnZSIsImhlYWRlcnMiLCJ3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50IiwiV1NQYXJzZWREYXRhIiwiV1NDdXJyZW50RGF0YSIsImhpdHMiLCJoaXQiLCJfc291cmNlIiwiYXR0cmlidXRlIiwidmFsdWUiLCJUUCIsIkhEIiwibGFzdERhdGUiLCJzdGFydHVwIl0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBQSxPQUFPQyxNQUFQLENBQWM7QUFBQ0MsU0FBTSxNQUFJQTtBQUFYLENBQWQ7QUFBaUMsSUFBSUMsTUFBSjtBQUFXSCxPQUFPSSxLQUFQLENBQWFDLFFBQVEsUUFBUixDQUFiLEVBQStCO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDSixhQUFPSSxDQUFQO0FBQVM7O0FBQXJCLENBQS9CLEVBQXNELENBQXREOztBQUU1QyxTQUFTTCxLQUFULENBQWVNLFFBQWYsRUFBd0JDLFNBQXhCLEVBQWtDO0FBQ2hDLE1BQUlDLGVBQWVQLE9BQU9NLFNBQVAsRUFBa0JFLE1BQWxCLENBQXlCLFlBQXpCLENBQW5CO0FBQ0FDLFNBQU9DLElBQVAsQ0FBWSxTQUFaLEVBQXNCLDRGQUEwRkgsWUFBaEgsRUFBNkg7QUFBQ0ksYUFBUTtBQUFULEdBQTdILEVBQTZJLFVBQVNDLEdBQVQsRUFBYUMsU0FBYixFQUF1QjtBQUNsS0osV0FB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QXBCLENBQXRDLEVBQTRELENBQTVEO0FBQStEUCxPQUFPSSxLQUFQLENBQWFDLFFBQVEsd0JBQVIsQ0FBYjtBQUUxRU8sT0FBTzhGLE9BQVAsQ0FBZSxNQUFNLENBQ25CO0FBQ0QsQ0FGRCxFIiwiZmlsZSI6Ii9hcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQge2FwaXh1fVxuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnXG5mdW5jdGlvbiBhcGl4dShjYWxsYmFjayxzdGFydERhdGUpe1xuICB2YXIgZm9ybWF0ZWREYXRlID0gbW9tZW50KHN0YXJ0RGF0ZSkuZm9ybWF0KCdZWVlZLU1NLUREJylcbiAgTWV0ZW9yLmNhbGwoJ2dldFBhZ2UnLCdodHRwOi8vYXBpLmFwaXh1LmNvbS92MS9oaXN0b3J5Lmpzb24/a2V5PTA1ZDcyNTk5YmVkOTQ2ZDg5ODMxNTUwMTUxNzA1MTImcT1DYXBhcmljYSZkdD0nK2Zvcm1hdGVkRGF0ZSx7dGltZW91dDoxNTAwMH0sZnVuY3Rpb24oZXJyLGFwaXh1RGF0YSl7XG4gICAgTWV0ZW9yLmNhbGwoJ2dldFBhZ2UnLCdodHRwOi8vYXBpLmFwaXh1LmNvbS92MS9jdXJyZW50Lmpzb24/a2V5PTA1ZDcyNTk5YmVkOTQ2ZDg5ODMxNTUwMTUxNzA1MTImcT1DYXBhcmljYScse3RpbWVvdXQ6MTUwMDB9LGZ1bmN0aW9uKGVycixhcGl4dURhdGFDdXJyZW50KXtcbiAgICAgIHZhciBhcGl4dVBhcnNlZERhdGEgPSBbXTtcbiAgICAgIHZhciBhcGl4dVBhcnNlZEN1cnJlbnREYXRhID0ge307XG4gICAgICBpZihhcGl4dURhdGEgJiYgYXBpeHVEYXRhLmRhdGEgJiYgYXBpeHVEYXRhLmRhdGEuZm9yZWNhc3QgJiYgYXBpeHVEYXRhLmRhdGEuZm9yZWNhc3QuZm9yZWNhc3RkYXkgJiYgIGFwaXh1RGF0YS5kYXRhLmZvcmVjYXN0LmZvcmVjYXN0ZGF5WzBdICYmIGFwaXh1RGF0YS5kYXRhLmZvcmVjYXN0LmZvcmVjYXN0ZGF5WzBdLmhvdXIpe1xuXG4gICAgICAgIGFwaXh1RGF0YS5kYXRhLmZvcmVjYXN0LmZvcmVjYXN0ZGF5WzBdLmhvdXIuZm9yRWFjaChob3VyPT57XG4gICAgICAgICAgYXBpeHVQYXJzZWREYXRhLnB1c2goe1xuICAgICAgICAgICAgdGVtcGVyYXR1cmU6aG91ci50ZW1wX2MsXG4gICAgICAgICAgICBodW1pZGl0eTogaG91ci5odW1pZGl0eSxcbiAgICAgICAgICAgIGRhdGU6KG5ldyBEYXRlKGhvdXIudGltZV9lcG9jaCoxMDAwKSkuZ2V0VGltZSgpXG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcblxuXG4gICAgICB9XG4gICAgICBpZihhcGl4dURhdGFDdXJyZW50ICYmIGFwaXh1RGF0YUN1cnJlbnQuZGF0YSAmJiBhcGl4dURhdGFDdXJyZW50LmRhdGEuY3VycmVudCl7XG4gICAgICAgIGFwaXh1UGFyc2VkQ3VycmVudERhdGEgPSB7XG4gICAgICAgICAgZGF0ZTogKG5ldyBEYXRlKGFwaXh1RGF0YUN1cnJlbnQuZGF0YS5jdXJyZW50Lmxhc3RfdXBkYXRlZF9lcG9jaCoxMDAwKSkuZ2V0VGltZSgpLFxuICAgICAgICAgIHRlbXBlcmF0dXJlOiBhcGl4dURhdGFDdXJyZW50LmRhdGEuY3VycmVudC50ZW1wX2MsXG4gICAgICAgICAgaHVtaWRpdHk6IGFwaXh1RGF0YUN1cnJlbnQuZGF0YS5jdXJyZW50Lmh1bWlkaXR5XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFwaXh1UGFyc2VkRGF0YS5zb3J0KGZ1bmN0aW9uKGEsYikge3JldHVybiAoYS5kYXRlID4gYi5kYXRlKSA/IDEgOiAoKGIuZGF0ZSA+IGEuZGF0ZSkgPyAtMSA6IDApO30gKTtcbiAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgaGlzdG9yaWM6IGFwaXh1UGFyc2VkRGF0YSxcbiAgICAgICAgY3VycmVudDogYXBpeHVQYXJzZWRDdXJyZW50RGF0YVxuICAgICAgfSxzdGFydERhdGUpO1xuICAgIH0pO1xuICB9KTtcbn1cbiIsImV4cG9ydCB7ZGFya1NreX1cblxuZnVuY3Rpb24gZGFya1NreShjYWxsYmFjayxzdGFydERhdGUpe1xuXG4gIHZhciBjdXJyZW50VGltZSA9IE1hdGgucm91bmQoKG5ldyBEYXRlKHN0YXJ0RGF0ZSkpLmdldFRpbWUoKS8xMDAwKVxuICBNZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHBzOi8vYXBpLmRhcmtza3kubmV0L2ZvcmVjYXN0Lzc5MDJkNjhmMGI1NjQ4Y2NlN2I5YjEyMTM5NDUxOTc0LzM4LjY3LC05LjIsJytjdXJyZW50VGltZSsnP3VuaXRzPXNpJyx7dGltZW91dDoxNTAwMH0sZnVuY3Rpb24oZXJyLGRhcmtTa3lEYXRhKXtcbiAgICAvL01ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cHM6Ly9hcGkuZGFya3NreS5uZXQvZm9yZWNhc3QvNzkwMmQ2OGYwYjU2NDhjY2U3YjliMTIxMzk0NTE5NzQvMzguNjcsLTkuMj91bml0cz1zaScsZnVuY3Rpb24oZXJyLGRhcmtTa3lEYXRhTGFzdCl7XG5cbiAgICAvL01ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cDovL3d3dy5zYXBvLnB0JyxmdW5jdGlvbihlcnIsZGFya1NreURhdGEpe1xuICAgICAgdmFyIGRhcmtTa3lQYXJzZWREYXRhID0gW107XG4gICAgICB2YXIgZGFya1NreVBhcnNlZEN1cnJlbnREYXRhID0ge31cbiAgICAgIGlmKGRhcmtTa3lEYXRhICYmIGRhcmtTa3lEYXRhLmRhdGEgJiYgZGFya1NreURhdGEuZGF0YS5ob3VybHkgJiYgZGFya1NreURhdGEuZGF0YS5ob3VybHkuZGF0YSl7XG4gICAgICAgIGRhcmtTa3lEYXRhLmRhdGEuaG91cmx5LmRhdGEuZm9yRWFjaChkYXRhPT57XG4gICAgICAgICAgZGFya1NreVBhcnNlZERhdGEucHVzaCh7XG4gICAgICAgICAgICB0ZW1wZXJhdHVyZTpkYXRhLnRlbXBlcmF0dXJlLFxuICAgICAgICAgICAgaHVtaWRpdHk6IGRhdGEuaHVtaWRpdHkqMTAwLFxuICAgICAgICAgICAgZGF0ZToobmV3IERhdGUoZGF0YS50aW1lKjEwMDApKS5nZXRUaW1lKClcbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgICAgaWYoZGFya1NreURhdGEgJiYgIGRhcmtTa3lEYXRhLmRhdGEgJiYgZGFya1NreURhdGEuZGF0YS5jdXJyZW50bHkpe1xuICAgICAgICBkYXJrU2t5UGFyc2VkQ3VycmVudERhdGEgPSB7XG4gICAgICAgICAgZGF0ZTogKG5ldyBEYXRlKGRhcmtTa3lEYXRhLmRhdGEuY3VycmVudGx5LnRpbWUqMTAwMCkpLmdldFRpbWUoKSxcbiAgICAgICAgICB0ZW1wZXJhdHVyZTogZGFya1NreURhdGEuZGF0YS5jdXJyZW50bHkudGVtcGVyYXR1cmUsXG4gICAgICAgICAgaHVtaWRpdHk6IGRhcmtTa3lEYXRhLmRhdGEuY3VycmVudGx5Lmh1bWlkaXR5KjEwMFxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBkYXJrU2t5UGFyc2VkRGF0YS5zb3J0KGZ1bmN0aW9uKGEsYikge3JldHVybiAoYS5kYXRlID4gYi5kYXRlKSA/IDEgOiAoKGIuZGF0ZSA+IGEuZGF0ZSkgPyAtMSA6IDApO30gKTtcbiAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgaGlzdG9yaWM6IGRhcmtTa3lQYXJzZWREYXRhLFxuICAgICAgICBjdXJyZW50OiBkYXJrU2t5UGFyc2VkQ3VycmVudERhdGFcbiAgICAgIH0sc3RhcnREYXRlKTtcbiAgICAvL30pO1xuICB9KTtcbn1cbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgSFRUUCB9IGZyb20gJ21ldGVvci9odHRwJztcbmltcG9ydCB7d2VhdGhlclN0YXRpb259IGZyb20gJy4vd2VhdGhlclN0YXRpb24uanMnXG5pbXBvcnQge2FwaXh1fSBmcm9tICcuL2FwaXh1LmpzJ1xuaW1wb3J0IHtkYXJrU2t5fSBmcm9tICcuL2RhcmtTa3kuanMnXG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCdcbmV4cG9ydCB7cG9zdERhdGFMb2FkZXJ9XG5cbmNvbnN0IGNhbGxTZXJ2aWNlID0gKHR5cGUsIHVybCwgb3B0aW9ucykgPT4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICBIVFRQLmNhbGwodHlwZSwgdXJsLCBvcHRpb25zLCAoZXJyb3IsIHJlc3VsdCkgPT4ge1xuICAgIGlmIChlcnJvcikge1xuICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgIH1cbiAgfSk7XG59KTtcblxuZnVuY3Rpb24gZ2V0RGlmZlZlY3Rvcih3ZWF0aGVyU3RhdGlvbkRhdGEsZGF0YVZlY3Qpe1xuICB2YXIgaVRlbXAgPSAwO1xuICB2YXIgaUh1bWlkaXR5ID0gMDtcbiAgdmFyIGRpZmZUZW1wID0gW107XG4gIHZhciBkaWZmSHVtaWRpdHkgPSBbXTtcbiAgdmFyIGRpZmYgPSBbXVxuICBpZihkYXRhVmVjdC5oaXN0b3JpYyl7XG4gICAgZGF0YVZlY3QuaGlzdG9yaWMuZm9yRWFjaChyZWNvcmQ9PntcbiAgICAgIHZhciBzdW1UZW1wZXJhdHVyZSA9IG51bGw7XG4gICAgICB2YXIgc3VtSHVtaWRpdHkgPSBudWxsO1xuICAgICAgdmFyIG5UZW1wZXJhdHVyZSA9IDA7XG4gICAgICB2YXIgbkh1bWlkaXR5ID0gMDtcbiAgICAgIHZhciBhY3R1YWxUaW1lID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcbiAgICAgIGlmKHJlY29yZC5kYXRlPGFjdHVhbFRpbWUpXG4gICAgICB7XG4gICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YS5oaXN0b3JpYyl7XG4gICAgICAgICAgZm9yKHZhciBpPTA7aTx3ZWF0aGVyU3RhdGlvbkRhdGEuaGlzdG9yaWMubGVuZ3RoO2krKylcbiAgICAgICAgICB7XG4gICAgICAgICAgICB2YXIgZGVsdGEgPSByZWNvcmQuZGF0ZS13ZWF0aGVyU3RhdGlvbkRhdGEuaGlzdG9yaWNbaV0uZGF0ZVxuXG4gICAgICAgICAgICBpZihkZWx0YTwzNjAwMDAwICYmIGRlbHRhPjApe1xuICAgICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGEuaGlzdG9yaWNbaV0udGVtcGVyYXR1cmUpXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdW1UZW1wZXJhdHVyZSA9IHN1bVRlbXBlcmF0dXJlICsgd2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljW2ldLnRlbXBlcmF0dXJlXG4gICAgICAgICAgICAgICAgblRlbXBlcmF0dXJlID0gblRlbXBlcmF0dXJlICsgMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGEuaGlzdG9yaWNbaV0uaHVtaWRpdHkpXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdW1IdW1pZGl0eSA9IHN1bUh1bWlkaXR5ICsgd2VhdGhlclN0YXRpb25EYXRhLmhpc3RvcmljW2ldLmh1bWlkaXR5XG4gICAgICAgICAgICAgICAgbkh1bWlkaXR5ID0gbkh1bWlkaXR5ICsgMTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfWVsc2UgaWYoZGVsdGEgPDApe1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYoc3VtVGVtcGVyYXR1cmUgJiYgc3VtSHVtaWRpdHkpXG4gICAgICAgICAge1xuICAgICAgICAgICAgZGlmZi5wdXNoKHtcbiAgICAgICAgICAgICAgZGF0ZTogcmVjb3JkLmRhdGUsXG4gICAgICAgICAgICAgIHRlbXBlcmF0dXJlOiBNYXRoLmFicyhzdW1UZW1wZXJhdHVyZS9uVGVtcGVyYXR1cmUgLSByZWNvcmQudGVtcGVyYXR1cmUpLFxuICAgICAgICAgICAgICBodW1pZGl0eTogTWF0aC5hYnMoc3VtSHVtaWRpdHkvbkh1bWlkaXR5IC0gcmVjb3JkLmh1bWlkaXR5KVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgfSlcbiAgfVxuICByZXR1cm4gZGlmZlxufVxuXG5mdW5jdGlvbiBwb3N0RGF0YUxvYWRlcihwcm9wcywgb25EYXRhLGUpIHtcblxuICB2YXIgZGF0ZSA9IG5ldyBEYXRlKHByb3BzLm1hdGNoLnBhcmFtcy5kYXRlKS5nZXRUaW1lKCk7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgZC5zZXRIb3VycygwLDAsMCwwKTtcbiAgdmFyIG1pZG5pZ2h0ID0gZC5nZXRUaW1lKCk7XG4gIHZhciBzdGFydERhdGUgPSBkYXRlP2RhdGU6bWlkbmlnaHQ7XG5cbiAgLy8gbG9hZCBkYXRhIGZyb20gdGhlIHNlcnZlci4gKHVzaW5nIHByb3BzLmlkIHRvIGlkZW50aWZ5IHRoZSBwb3N0KVxuICAvLyAoSGVyZSdsbCB3ZSdsbCB1c2Ugc2V0VGltZW91dCBmb3IgZGVtb25zdHJhdGlvbiBwdXJwb3NlKVxuICB3ZWF0aGVyU3RhdGlvbihmdW5jdGlvbih3ZWF0aGVyU3RhdGlvbkRhdGEsc3RhcnREYXRlKXtcbiAgICBhcGl4dShmdW5jdGlvbihhcGl4dURhdGEsc3RhcnREYXRlKXtcbiAgICAgIGRhcmtTa3koZnVuY3Rpb24oZGFya1NreURhdGEsc3RhcnREYXRlKXtcbiAgICAgICAgYXBpeHVEYXRhLmRpZmYgPSBnZXREaWZmVmVjdG9yKHdlYXRoZXJTdGF0aW9uRGF0YSxhcGl4dURhdGEpXG4gICAgICAgIGRhcmtTa3lEYXRhLmRpZmYgPSBnZXREaWZmVmVjdG9yKHdlYXRoZXJTdGF0aW9uRGF0YSxkYXJrU2t5RGF0YSlcbiAgICAgICAgb25EYXRhKG51bGwsIHtcbiAgICAgICAgICB3ZWF0aGVyU3RhdGlvbjogd2VhdGhlclN0YXRpb25EYXRhLFxuICAgICAgICAgIGFwaXh1OiBhcGl4dURhdGEsXG4gICAgICAgICAgZGFya1NreTogZGFya1NreURhdGEsXG4gICAgICAgICAgc3RhcnREYXRlOiBtb21lbnQoc3RhcnREYXRlKS5mb3JtYXQoJ1lZWVktTU0tREQnKVxuICAgICAgICB9KVxuICAgICAgfSxzdGFydERhdGUpO1xuICAgIH0sc3RhcnREYXRlKTtcbiAgfSxzdGFydERhdGUpXG59XG5pZihNZXRlb3IuaXNTZXJ2ZXIpe1xuICBNZXRlb3IubWV0aG9kcyh7XG4gICAgZ2V0UGFnZSh1cmwsb3B0aW9ucykge1xuICAgICAgcmV0dXJuIGNhbGxTZXJ2aWNlKFxuICAgICAgICAnR0VUJyxcbiAgICAgICAgdXJsLFxuICAgICAgICBvcHRpb25zXG4gICAgICApLnRoZW4oKHJlc3VsdCkgPT4gcmVzdWx0KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcignNTAwJywgYCR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gIH0pO1xufVxuIiwiZXhwb3J0IHt3ZWF0aGVyU3RhdGlvbn1cbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50J1xuZnVuY3Rpb24gd2VhdGhlclN0YXRpb24oY2FsbGJhY2ssc3RhcnREYXRlKXtcbiAgdmFyIGZvcm1hdGVkRGF0ZSA9IG1vbWVudChzdGFydERhdGUpLmZvcm1hdCgnWVlZWS1NTS1ERCcpXG4gIE1ldGVvci5jYWxsKCdnZXRQYWdlJywnaHR0cDovL2VsYXN0aWNzZWFyY2gud2F6aXVwLmlvL3dheml1cC11aS13ZWF0aGVyL19zZWFyY2g/cT1uYW1lOldlYXRoZXJTdGF0aW9uVUkmc29ydD10aW1lOmRlc2Mmc2l6ZT02MDAwJnE9dGltZTonK2Zvcm1hdGVkRGF0ZSx7dGltZW91dDoxNTAwMH0sZnVuY3Rpb24oZXJyLHdlYXRoZXJTdGF0aW9uRGF0YSl7XG4gICAgLy9NZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHA6Ly9lbGFzdGljc2VhcmNoLndheml1cC5pby93YXppdXAtdWktd2VhdGhlci9fc2VhcmNoP3E9bmFtZTpXZWF0aGVyU3RhdGlvblVJJnNvcnQ9dGltZTpkZXNjJnNpemU9MScsZnVuY3Rpb24oZXJyLHdlYXRoZXJTdGF0aW9uRGF0YUxhc3Qpe1xuXG4gICAgICBNZXRlb3IuY2FsbCgnZ2V0UGFnZScsJ2h0dHA6Ly9icm9rZXIud2F6aXVwLmlvL3YyL2VudGl0aWVzL1dlYXRoZXJTdGF0aW9uVUknLHtcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgXCJGaXdhcmUtU2VydmljZVBhdGhcIjpcIi9VSS9XRUFUSEVSXCIsXG4gICAgICAgICAgICBcIkZpd2FyZS1TZXJ2aWNlXCI6XCJ3YXppdXBcIlxuICAgICAgICAgIH0sXG4gICAgICAgICAgdGltZW91dDogMTUwMDBcbiAgICAgICAgfSxmdW5jdGlvbihlcnIsd2VhdGhlclN0YXRpb25EYXRhQ3VycmVudCl7XG4gICAgICAgICAgdmFyIFdTUGFyc2VkRGF0YSA9IFtdO1xuICAgICAgICAgIHZhciBXU0N1cnJlbnREYXRhID0ge31cbiAgICAgICAgICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gICAgICAgICAgZC5zZXRIb3VycygwLDAsMCwwKTtcbiAgICAgICAgICB2YXIgbWlkbmlnaHQgPSBkLmdldFRpbWUoKTtcbiAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGEgJiYgd2VhdGhlclN0YXRpb25EYXRhLmRhdGEgJiYgd2VhdGhlclN0YXRpb25EYXRhLmRhdGEuaGl0cyAmJiB3ZWF0aGVyU3RhdGlvbkRhdGEuZGF0YS5oaXRzLmhpdHMgJiYgd2VhdGhlclN0YXRpb25EYXRhLmRhdGEuaGl0cy5oaXRzLmxlbmd0aCApXG4gICAgICAgICAge1xuICAgICAgICAgICAgd2VhdGhlclN0YXRpb25EYXRhLmRhdGEuaGl0cy5oaXRzLmZvckVhY2goaGl0PT57XG4gICAgICAgICAgICAgIGlmKChuZXcgRGF0ZShoaXQuX3NvdXJjZS50aW1lKSkuZ2V0VGltZSgpPm1pZG5pZ2h0LTM2MDAwMDAgfHwgdHJ1ZSl7XG4gICAgICAgICAgICAgICAgaWYoaGl0Ll9zb3VyY2UpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgaWYoaGl0Ll9zb3VyY2UuYXR0cmlidXRlPT1cIlRQXCIpXG4gICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIFdTUGFyc2VkRGF0YS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICBkYXRlOihuZXcgRGF0ZShoaXQuX3NvdXJjZS50aW1lKSkuZ2V0VGltZSgpLFxuICAgICAgICAgICAgICAgICAgICAgIHRlbXBlcmF0dXJlOmhpdC5fc291cmNlLnZhbHVlXG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZihoaXQuX3NvdXJjZS5hdHRyaWJ1dGU9PVwiSERcIilcbiAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgV1NQYXJzZWREYXRhLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgIGRhdGU6KG5ldyBEYXRlKGhpdC5fc291cmNlLnRpbWUpKS5nZXRUaW1lKCksXG4gICAgICAgICAgICAgICAgICAgICAgaHVtaWRpdHk6aGl0Ll9zb3VyY2UudmFsdWVcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuICAgICAgICAgIFdTUGFyc2VkRGF0YS5zb3J0KGZ1bmN0aW9uKGEsYikge3JldHVybiAoYS5kYXRlID4gYi5kYXRlKSA/IDEgOiAoKGIuZGF0ZSA+IGEuZGF0ZSkgPyAtMSA6IDApO30gKTtcbiAgICAgICAgICBpZih3ZWF0aGVyU3RhdGlvbkRhdGFDdXJyZW50ICYmIHdlYXRoZXJTdGF0aW9uRGF0YUN1cnJlbnQuZGF0YSlcbiAgICAgICAgICB7XG4gICAgICAgICAgICB2YXIgdGVtcGVyYXR1cmUgPSBudWxsO1xuICAgICAgICAgICAgZm9yKHZhciBpPVdTUGFyc2VkRGF0YS5sZW5ndGgtMTtpPjA7aS0tKVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBpZihXU1BhcnNlZERhdGFbaV0udGVtcGVyYXR1cmUpe1xuICAgICAgICAgICAgICAgIHRlbXBlcmF0dXJlID0gV1NQYXJzZWREYXRhW2ldLnRlbXBlcmF0dXJlXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBodW1pZGl0eSA9IG51bGw7XG4gICAgICAgICAgICBmb3IodmFyIGk9V1NQYXJzZWREYXRhLmxlbmd0aC0xO2k+MDtpLS0pXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGlmKFdTUGFyc2VkRGF0YVtpXS5odW1pZGl0eSl7XG4gICAgICAgICAgICAgICAgaHVtaWRpdHkgPSBXU1BhcnNlZERhdGFbaV0uaHVtaWRpdHlcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhLlRQKXtcbiAgICAgICAgICAgICAgLy9XU0N1cnJlbnREYXRhLnRlbXBlcmF0dXJlID0gd2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhLlRQLnZhbHVlXG4gICAgICAgICAgICAgIFdTQ3VycmVudERhdGEudGVtcGVyYXR1cmUgPSB0ZW1wZXJhdHVyZVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhLkhEKXtcbiAgICAgICAgICAgICAgLy9XU0N1cnJlbnREYXRhLmh1bWlkaXR5ID0gd2VhdGhlclN0YXRpb25EYXRhQ3VycmVudC5kYXRhLkhELnZhbHVlXG4gICAgICAgICAgICAgIFdTQ3VycmVudERhdGEuaHVtaWRpdHkgPSBodW1pZGl0eVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGxhc3REYXRlID0gbnVsbDtcbiAgICAgICAgICAgIC8qaWYod2VhdGhlclN0YXRpb25EYXRhTGFzdCl7XG4gICAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YUxhc3QuZGF0YSl7XG4gICAgICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhTGFzdC5kYXRhLmhpdHMpe1xuICAgICAgICAgICAgICAgICAgaWYod2VhdGhlclN0YXRpb25EYXRhTGFzdC5kYXRhLmhpdHMuaGl0cyl7XG4gICAgICAgICAgICAgICAgICAgIGlmKHdlYXRoZXJTdGF0aW9uRGF0YUxhc3QuZGF0YS5oaXRzLmhpdHMubGVuZ3RoKXtcbiAgICAgICAgICAgICAgICAgICAgICBsYXN0RGF0ZSA9IHdlYXRoZXJTdGF0aW9uRGF0YUxhc3QuZGF0YS5oaXRzLmhpdHNbMF0uc29ydFswXVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9Ki9cbiAgICAgICAgICAgIGlmKFdTUGFyc2VkRGF0YS5sZW5ndGgpe1xuICAgICAgICAgICAgICBXU0N1cnJlbnREYXRhLmRhdGUgPSBXU1BhcnNlZERhdGFbV1NQYXJzZWREYXRhLmxlbmd0aC0xXS5kYXRlXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICB9XG4gICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgaGlzdG9yaWM6IFdTUGFyc2VkRGF0YSxcbiAgICAgICAgICAgIGN1cnJlbnQ6IFdTQ3VycmVudERhdGFcbiAgICAgICAgICB9LHN0YXJ0RGF0ZSk7XG4gICAgICB9KVxuICAgIC8vfSk7XG4gIH0pXG59XG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCAnLi4vaW1wb3J0cy9hcGkvZGF0YS5qcydcbk1ldGVvci5zdGFydHVwKCgpID0+IHtcbiAgLy8gY29kZSB0byBydW4gb24gc2VydmVyIGF0IHN0YXJ0dXBcbn0pO1xuIl19
