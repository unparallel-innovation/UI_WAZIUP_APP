export {weatherStation}
import moment from 'moment'
function weatherStation(callback,startDate){
  var formatedDate = moment(startDate).format('YYYY-MM-DD')
  Meteor.call('getPage','http://elasticsearch.waziup.io/waziup-ui-weather/_search?q=name:WeatherStationUI&sort=time:desc&size=6000&q=time:'+formatedDate,function(err,weatherStationData){
    //Meteor.call('getPage','http://elasticsearch.waziup.io/waziup-ui-weather/_search?q=name:WeatherStationUI&sort=time:desc&size=1',function(err,weatherStationDataLast){

      Meteor.call('getPage','http://broker.waziup.io/v2/entities/WeatherStationUI',{
        headers: {
            "Fiware-ServicePath":"/UI/WEATHER",
            "Fiware-Service":"waziup"
          }
        },function(err,weatherStationDataCurrent){
          var WSParsedData = [];
          var WSCurrentData = {}
          var d = new Date();
          d.setHours(0,0,0,0);
          var midnight = d.getTime();
          if(weatherStationData.data)
          {
            if(weatherStationData.data.hits)
            {
              if(weatherStationData.data.hits.hits)
              {
                if(weatherStationData.data.hits.hits.length)
                {
                  weatherStationData.data.hits.hits.forEach(hit=>{
                    if((new Date(hit._source.time)).getTime()>midnight-3600000 || true){
                      if(hit._source)
                      {
                        if(hit._source.attribute=="TP")
                        {
                          WSParsedData.push({
                            date:(new Date(hit._source.time)).getTime(),
                            temperature:hit._source.value
                          })
                        }
                        if(hit._source.attribute=="HD")
                        {
                          WSParsedData.push({
                            date:(new Date(hit._source.time)).getTime(),
                            humidity:hit._source.value
                          })
                        }
                      }
                    }
                  })
                }
              }
            }
          }
          WSParsedData.sort(function(a,b) {return (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0);} );
          if(weatherStationDataCurrent.data)
          {
            if(weatherStationDataCurrent.data){
              var temperature = null;
              for(var i=WSParsedData.length-1;i>0;i--)
              {
                if(WSParsedData[i].temperature){
                  temperature = WSParsedData[i].temperature
                  break;
                }
              }
              var humidity = null;
              for(var i=WSParsedData.length-1;i>0;i--)
              {
                if(WSParsedData[i].humidity){
                  humidity = WSParsedData[i].humidity
                  break;
                }
              }
              if(weatherStationDataCurrent.data.TP){
                //WSCurrentData.temperature = weatherStationDataCurrent.data.TP.value
                WSCurrentData.temperature = temperature
              }
              if(weatherStationDataCurrent.data.HD){
                //WSCurrentData.humidity = weatherStationDataCurrent.data.HD.value
                WSCurrentData.humidity = humidity
              }
              var lastDate = null;
              /*if(weatherStationDataLast){
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
              if(WSParsedData.length){
                WSCurrentData.date = WSParsedData[WSParsedData.length-1].date
              }
            }
          }
          callback({
            historic: WSParsedData,
            current: WSCurrentData
          },startDate);
      })
    //});
  })
}
