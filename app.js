import React from "react";
import {BrowserRouter,Routes,Route} from "react-router-dom";

import Home from "./home";
import Jobs from "./job";
import JobDetails from "./jobs detail";
import Dashboard from "./dashb";

function App(){

return(

<BrowserRouter>

<Routes>

<Route path="/" element={<Home/>}/>
<Route path="/jobs" element={<Jobs/>}/>
<Route path="/job/:id" element={<JobDetails/>}/>
<Route path="/dashboard" element={<Dashboard/>}/>

</Routes>

</BrowserRouter>

)

}

export default App;