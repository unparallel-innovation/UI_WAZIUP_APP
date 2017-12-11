import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import {weatherStation} from './weatherStation.js'
import {apixu} from './apixu.js'
import {darkSky} from './darkSky.js'
import moment from 'moment'
export {postDataLoader}

const callService = (type, url, options) => new Promise((resolve, reject) => {
  HTTP.call(type, url, options, (error, result) => {
    if (error) {
      reject(error);
    } else {
      resolve(result);
    }
  });
});

function getDiffVector(weatherStationData,dataVect){
  var iTemp = 0;
  var iHumidity = 0;
  var diffTemp = [];
  var diffHumidity = [];
  var diff = []
  if(dataVect.historic){
    dataVect.historic.forEach(record=>{
      var sumTemperature = null;
      var sumHumidity = null;
      var nTemperature = 0;
      var nHumidity = 0;
      var actualTime = (new Date()).getTime();
      if(record.date<actualTime)
      {
        if(weatherStationData.historic){
          for(var i=0;i<weatherStationData.historic.length;i++)
          {
            var delta = record.date-weatherStationData.historic[i].date
            if(delta<3600000 && delta>0){
              if(weatherStationData.historic[i].temperature)
              {
                sumTemperature = sumTemperature + weatherStationData.historic[i].temperature
                nTemperature = nTemperature + 1;
              }
              if(weatherStationData.historic[i].humidity)
              {
                sumHumidity = sumHumidity + weatherStationData.historic[i].humidity
                nHumidity = nHumidity + 1;
              }
            }else if(delta <0){
              break;
            }
          }
          if(sumTemperature && sumHumidity)
          {
            diff.push({
              date: record.date,
              temperature: Math.abs(sumTemperature/nTemperature - record.temperature),
              humidity: Math.abs(sumHumidity/nHumidity - record.humidity)
            })

          }
        }
      }

    })
  }
  return diff
}

function postDataLoader(props, onData,e) {

  var date = new Date(props.match.params.date).getTime();
  var d = new Date();
  d.setHours(0,0,0,0);
  var midnight = d.getTime();
  var startDate = date?date:midnight;

  // load data from the server. (using props.id to identify the post)
  // (Here'll we'll use setTimeout for demonstration purpose)
  weatherStation(function(weatherStationData,startDate){
    apixu(function(apixuData,startDate){
      darkSky(function(darkSkyData,startDate){
        apixuData.diff = getDiffVector(weatherStationData,apixuData)
        darkSkyData.diff = getDiffVector(weatherStationData,darkSkyData)
        onData(null, {
          weatherStation: weatherStationData,
          apixu: apixuData,
          darkSky: darkSkyData,
          startDate: moment(startDate).format('YYYY-MM-DD')
        })
      },startDate);
    },startDate);
  },startDate)
}
if(Meteor.isServer){
  Meteor.methods({
    getPage(url,options) {
      return callService(
        'GET',
        url,
        options
      ).then((result) => result).catch((error) => {
        throw new Meteor.Error('500', `${error.message}`);
      });
    },
  });
}
