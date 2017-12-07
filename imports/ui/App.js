import React, { Component } from 'react';
import { compose } from 'react-komposer';
import {Data} from './Data.js'

// App component - represents the whole app
export default class App extends Component {

  render() {

    //const WeatherStationData = compose(postDataLoader)(Data);
    return (
      <div>
        <Data/>
      </div>
    );
  }
}
