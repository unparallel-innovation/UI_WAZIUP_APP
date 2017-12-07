export {weatherStation}

function weatherStation(callback){

  Meteor.call('getPage','http://elasticsearch.waziup.io/waziup-ui-weather/_search?q=name:WeatherStationUI&sort=time:desc&size=6000',function(err,weatherStationData){
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
                  if((new Date(hit._source.time)).getTime()>midnight-3600000){
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
            if(weatherStationDataCurrent.data.TP){
              WSCurrentData.temperature = weatherStationDataCurrent.data.TP.value
            }
            if(weatherStationDataCurrent.data.HD){
              WSCurrentData.humidity = weatherStationDataCurrent.data.HD.value
            }
            if(WSParsedData.length){
              WSCurrentData.date = WSParsedData[WSParsedData.length-1].date
            }
          }
        }
        callback({
          historic: WSParsedData,
          current: WSCurrentData
        });
    })

  })
}
