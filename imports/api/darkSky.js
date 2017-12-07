export {darkSky}

function darkSky(callback){
  var currentTime = Math.round((new Date()).getTime()/1000)
  Meteor.call('getPage','https://api.darksky.net/forecast/7902d68f0b5648cce7b9b12139451974/38.67,-9.2,'+currentTime+'?units=si',function(err,darkSkyData){
  //Meteor.call('getPage','http://www.sapo.pt',function(err,darkSkyData){
    var darkSkyParsedData = [];
    var darkSkyParsedCurrentData = {}
    if(darkSkyData){
      if(darkSkyData.data){
        if(darkSkyData.data.hourly){
          if(darkSkyData.data.hourly.data){
            darkSkyData.data.hourly.data.forEach(data=>{
              darkSkyParsedData.push({
                temperature:data.temperature,
                humidity: data.humidity*100,
                date:(new Date(data.time*1000)).getTime()
              })
            })
          }
        }
      }
    }
    if(darkSkyData.data)
    {
      if(darkSkyData.data.currently)
      {
        darkSkyParsedCurrentData = {
          date: (new Date(darkSkyData.data.currently.time*1000)).getTime(),
          temperature: darkSkyData.data.currently.temperature,
          humidity: darkSkyData.data.currently.humidity*100
        }
      }
    }
    darkSkyParsedData.sort(function(a,b) {return (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0);} );
    callback({
      historic: darkSkyParsedData,
      current: darkSkyParsedCurrentData
    });
  });
}
