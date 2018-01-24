import React, { Component } from 'react';
import { compose } from 'react-komposer';
import {Data} from './Data.js'
import {HashRouter, Route } from 'react-router-dom'
// App component - represents the whole app
export default class App extends Component {

  render() {

    //const WeatherStationData = compose(postDataLoader)(Data);
    return (
      <HashRouter>
        <div>
          <Route exact path="/" component={Data}/>
          <Route path="/:date" component={Data}/>
        </div>
      </HashRouter>
    );
  }
}
