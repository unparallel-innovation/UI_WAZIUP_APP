import React, { Component } from 'react';
import { compose } from 'react-komposer';
import {Container, Table} from 'reactstrap'
import ReactHighcharts from 'react-highcharts'
import {Highlight} from 'react-highlight'
import {postDataLoader} from '../api/data.js'
import DatePicker from 'react-datepicker';
import moment from 'moment'
import { Route, withRouter } from 'react-router-dom'
import 'react-datepicker/dist/react-datepicker.css';
import './Data.css'
// App component - represents the whole app
export {Data}

const config = {
  location: "38.67,-9.2",
  elasticsearchUrl : "http://elasticsearch.waziup.io/waziup-ui-weather/_search",
  elasticsearchSearchQuery : "name:WeatherStationUI",
  brokerUrl : "http://broker.waziup.io/v2/entities/WeatherStationUI",
  fiwareService : "waziup",
  fiwareServicePath : "/UI/WEATHER"
}

class Data_ extends Component {
  constructor(props){
    super(props)
    this.handleChange = this.handleChange.bind(this);
  }
  renderGraph(type,field, title, unit,headerDate){
    var weatherStation = this.props.weatherStation[type]?this.props.weatherStation[type].filter(function(record){
        return record[field]
    }).map(
      record=>([record.date,record[field]])
    ):[];
    var apixu = this.props.apixu && this.props.apixu[type]?this.props.apixu[type].filter(function(record){
      return record[field]
    }).map(
      record=>([record.date,record[field]])
    ):[];
    var darkSky = this.props.darkSky && this.props.darkSky[type]?this.props.darkSky[type].filter(function(record){
      return record[field]
    }).map(
      record=>([record.date,record[field]])
    ):[];
    var series = []
    if(weatherStation.length)
    {
      series.push({
        name:"WAZIUP Weather Station",
        data: weatherStation
      })
    }
    if(apixu.length){
      series.push({
        name:type!="diff"?"Apixu":"Difference from Apixu",
        data: apixu
      })
    }
    if(darkSky.length){
      series.push({
        name:type!="diff"?"Dark Sky":"Difference from Dark Sky",
        data: darkSky
      })
    }

    var config = {
      title:{
        text: title
      },
      xAxis: {
        type: 'datetime',
        plotLines: type!="diff"?[{
          color: '#FF8000',
          value: headerDate,
          width: 1,
          label:{
            text: "Now",
            rotation: 0
          }
        }]:[],
      },
      yAxis: {
        title:{
          text: "Value (" + unit + ")"
        },
        min: type=="diff"?0:null
      },
      tooltip: {
        pointFormat: "{series.name}: <b>{point.y:.2f}</b>"
      },

      series: series
    };
    return (
      <ReactHighcharts config={config}/>
    )
  }
  handleChange(date) {
    this.props.history.push(date.format("YYYY-MM-DD"))
  }
  render() {
    var dateFormat = 'DD-MM-YYYY, H:mm:ss'
    var weatherStationTemp = this.props.weatherStation?this.props.weatherStation.current.temperature:""
    var apixuTemp = this.props.apixu?this.props.apixu.current.temperature:""
    var darkSkyTemp = this.props.darkSky?this.props.darkSky.current.temperature:""

    var headerDate = this.props.weatherStation && this.props.weatherStation.headerDate?this.props.weatherStation.headerDate:null;

    var weatherStationHumidity = this.props.weatherStation?this.props.weatherStation.current.humidity:""
    var apixuHumidity = this.props.apixu?this.props.apixu.current.humidity:""
    var darkSkyHumidity = this.props.darkSky?this.props.darkSky.current.humidity:""
    var showLoading = this.props.match.params.date!=this.props.startDate && this.props.match.params.date!=undefined
    return (
      <Route render={({history})=>(
        <div>
          {showLoading?<p>Loading...</p>:""}
          {!showLoading?<Container>
            <br></br>
            <h5>Current Weather Data</h5>
            <Table>
              <thead>
                <tr>
                  <th>Attribute</th>
                  <th>WAZIUP Weather Station</th>
                  <th>Apixu</th>
                  <th>Apixu (Difference)</th>
                  <th>Dark Sky</th>
                  <th>Dark Sky (Difference)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">Temperature (ºC)</th>
                  <td>{weatherStationTemp?weatherStationTemp.toFixed(2):""}</td>
                  <td>{apixuTemp?apixuTemp.toFixed(2):""}</td>
                  <td>{apixuTemp?Math.abs(apixuTemp-weatherStationTemp).toFixed(2):""}</td>
                  <td>{darkSkyTemp?darkSkyTemp.toFixed(2):""}</td>
                  <td>{darkSkyTemp?Math.abs(darkSkyTemp-weatherStationTemp).toFixed(2):""}</td>
                </tr>
                <tr>
                  <th scope="row">Humidity (%)</th>
                  <td>{weatherStationHumidity?weatherStationHumidity.toFixed(0):""}</td>
                  <td>{apixuHumidity?apixuHumidity.toFixed(0):""}</td>
                  <td>{apixuHumidity?Math.abs(apixuHumidity-weatherStationHumidity).toFixed(2):""}</td>
                  <td>{darkSkyHumidity?darkSkyHumidity.toFixed(0):""}</td>
                  <td>{darkSkyHumidity?Math.abs(darkSkyHumidity-weatherStationHumidity).toFixed(2):""}</td>
                </tr>
                <tr>
                  <th scope="row">Last Observation</th>
                  <td>{this.props.weatherStation.current.date?moment(this.props.weatherStation.current.date).format(dateFormat):""}</td>
                  <td colSpan="2">{this.props.apixu && this.props.apixu.current.date?moment(this.props.apixu.current.date).format(dateFormat):""}</td>
                  <td colSpan="2">{this.props.darkSky && this.props.darkSky.current.date?moment(this.props.darkSky.current.date).format(dateFormat):""}</td>
                </tr>
              </tbody>
            </Table>
            <hr></hr>
            <h5>Historic Forecast Weather Data</h5>
            Showing data from:
            <DatePicker
                selected={this.props.match.params.date?moment(this.props.match.params.date):moment()}
                onChange={this.handleChange}
                dateFormat="DD-MM-YYYY"
            />
            <br></br>
            {this.renderGraph("historic","temperature", "Temperature", "ºC",headerDate)}
            {this.renderGraph("historic","humidity", "Humidity", "%",headerDate)}
            {this.renderGraph("diff","temperature", "Temperature (Difference from WAZIUP Weather Station)", "ΔºC",headerDate)}
            {this.renderGraph("diff","humidity", "Humidity (Difference from WAZIUP Weather Station)", "Δ%",headerDate)}

          </Container>:""}
        </div>)} />
    );
  }
}


const Data = compose(postDataLoader,{env:{config: config},loadingHandler: () => (
  <p>Loading...</p>
)})(Data_);
