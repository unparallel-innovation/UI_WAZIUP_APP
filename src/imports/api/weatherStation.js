export {weatherStation}
import moment from 'moment'
function weatherStation(callback,startDate,config){
  var elasticsearchUrl = config && config.elasticsearchUrl?config.elasticsearchUrl:""
  var elasticsearchSearchQuery = config && config.elasticsearchSearchQuery?config.elasticsearchSearchQuery:""
  var brokerUrl = config && config.brokerUrl?config.brokerUrl:""
  var fiwareServicePath = config && config.fiwareServicePath?config.fiwareServicePath:""
  var fiwareService = config && config.fiwareService?config.fiwareService:""

  var formatedDate = moment(startDate).format('YYYY-MM-DD')
  Meteor.call('getPage', elasticsearchUrl + '?q='+elasticsearchSearchQuery+'&sort=time:desc&size=6000&q=time:'+formatedDate,{timeout:15000},function(err,weatherStationData){
    Meteor.call('getPage',elasticsearchUrl + '?q='+elasticsearchSearchQuery+'&sort=time:desc&size=1',{timeout:15000},function(err,weatherStationDataLast){
      Meteor.call('getPage',brokerUrl,{
        headers: {
            "Fiware-ServicePath":fiwareServicePath,
            "Fiware-Service":fiwareService
          },
          timeout: 15000
        },function(err,weatherStationDataCurrent){
          var WSParsedData = [];
          var WSCurrentData = {}
          var d = new Date();
          d.setHours(0,0,0,0);
          var midnight = d.getTime();
          if(weatherStationData && weatherStationData.data && weatherStationData.data.hits && weatherStationData.data.hits.hits && weatherStationData.data.hits.hits.length )
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
          WSParsedData.sort(function(a,b) {return (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0);} );
          if(weatherStationDataCurrent && weatherStationDataCurrent.data)
          {
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
              WSCurrentData.temperature = weatherStationDataCurrent.data.TP.value
              //WSCurrentData.temperature = temperature
            }
            if(weatherStationDataCurrent.data.HD){
              WSCurrentData.humidity = weatherStationDataCurrent.data.HD.value
              //WSCurrentData.humidity = humidity
            }
            var lastDate = null;
            if(weatherStationDataLast && weatherStationDataLast.data && weatherStationDataLast.data.hits && weatherStationDataLast.data.hits.hits && weatherStationDataLast.data.hits.hits.length){
              lastDate = weatherStationDataLast.data.hits.hits[0].sort[0]
            }
            if(WSParsedData.length){
              WSCurrentData.date = lastDate
              //WSCurrentData.date = WSParsedData[WSParsedData.length-1].date
            }

          }
          callback({
            historic: WSParsedData,
            current: WSCurrentData
          },startDate);
      })
    });
  })
}
