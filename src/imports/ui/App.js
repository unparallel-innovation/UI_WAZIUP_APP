import React, { Component } from 'react';
import { compose } from 'react-komposer';
import {Data} from './Data.js'
import {HashRouter, Route, Redirect } from 'react-router-dom'
import moment from 'moment'
// App component - represents the whole app
export default class App extends Component {

  render() {
    //const WeatherStationData = compose(postDataLoader)(Data);
    return (
      <HashRouter>
        <div>
          <Route exact path="/" render={()=>(
              <Redirect to={`/${moment().format('YYYY-MM-DD')}`} />
            )}/>
          <Route path="/:date" component={Data}/>
        </div>
      </HashRouter>
    );
  }
}
