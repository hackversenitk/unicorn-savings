import React, { Component } from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import "./assets/lib/scss/black-dashboard-react.scss";
import LandingPage from "./pages/LandingPage";
import UserPage from "./pages/UserPage";
import NewPage from "./pages/NewPage";

class App extends Component {
  state = {};
  render() {
    return (
      <div>
        <Router>
          <Switch>
            <Route path="/user" component={UserPage} />
            <Route path="/new" component={NewPage} />
            <Route exact path="/" component={LandingPage} />
          </Switch>
        </Router>
      </div>
    );
  }
}

export default App;
