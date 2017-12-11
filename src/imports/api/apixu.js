export {apixu}
import moment from 'moment'
function apixu(callback,startDate){
  var formatedDate = moment(startDate).format('YYYY-MM-DD')
  Meteor.call('getPage','http://api.apixu.com/v1/history.json?key=05d72599bed946d8983155015170512&q=Caparica&dt='+formatedDate,function(err,apixuData){
    Meteor.call('getPage','http://api.apixu.com/v1/current.json?key=05d72599bed946d8983155015170512&q=Caparica',function(err,apixuDataCurrent){
      var apixuParsedData = [];
      var apixuParsedCurrentData = {};
      if(apixuData){
        if(apixuData.data)
        {
          if(apixuData.data.forecast){
            if(apixuData.data.forecast.forecastday){
              if(apixuData.data.forecast.forecastday[0]){
                if(apixuData.data.forecast.forecastday[0].hour){
                  apixuData.data.forecast.forecastday[0].hour.forEach(hour=>{
                    apixuParsedData.push({
                      temperature:hour.temp_c,
                      humidity: hour.humidity,
                      date:(new Date(hour.time_epoch*1000)).getTime()
                    })
                  })

                }
              }
            }
          }
        }
      }
      if(apixuDataCurrent){
        if(apixuDataCurrent.data)
        {
          if(apixuDataCurrent.data.current){
            apixuParsedCurrentData = {
              date: (new Date(apixuDataCurrent.data.current.last_updated_epoch*1000)).getTime(),
              temperature: apixuDataCurrent.data.current.temp_c,
              humidity: apixuDataCurrent.data.current.humidity
            }
          }
        }
      }
      apixuParsedData.sort(function(a,b) {return (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0);} );
      callback({
        historic: apixuParsedData,
        current: apixuParsedCurrentData
      },startDate);
    });
  });
}
