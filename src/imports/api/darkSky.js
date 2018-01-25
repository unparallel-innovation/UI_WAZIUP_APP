export {darkSky}

function darkSky(callback,startDate,config){

  var location = config && config.location ?config.location:"38.67,-9.2";
  var currentTime = Math.round((new Date(startDate)).getTime()/1000)
  Meteor.call('getPage','https://api.darksky.net/forecast/7902d68f0b5648cce7b9b12139451974/'+location+','+currentTime+'?units=si',{timeout:15000},function(err,darkSkyData){
    Meteor.call('getPage','https://api.darksky.net/forecast/7902d68f0b5648cce7b9b12139451974/'+location+'?units=si',{timeout:15000},function(err,darkSkyDataLast){

    //Meteor.call('getPage','http://www.sapo.pt',function(err,darkSkyData){
      var darkSkyParsedData = [];
      var darkSkyParsedCurrentData = {}
      if(darkSkyData && darkSkyData.data && darkSkyData.data.hourly && darkSkyData.data.hourly.data){
        darkSkyData.data.hourly.data.forEach(data=>{
          darkSkyParsedData.push({
            temperature:data.temperature,
            humidity: data.humidity*100,
            date:(new Date(data.time*1000)).getTime()
          })
        })
      }
      if(darkSkyDataLast &&  darkSkyDataLast.data && darkSkyDataLast.data.currently){
        darkSkyParsedCurrentData = {
          date: (new Date(darkSkyDataLast.data.currently.time*1000)).getTime(),
          temperature: darkSkyDataLast.data.currently.temperature,
          humidity: darkSkyDataLast.data.currently.humidity*100
        }
      }
      darkSkyParsedData.sort(function(a,b) {return (a.date > b.date) ? 1 : ((b.date > a.date) ? -1 : 0);} );
      callback({
        historic: darkSkyParsedData,
        current: darkSkyParsedCurrentData
      },startDate);
    });
  });
}
