import React from "react";
import {useEffect,useState} from "react";
import {useParams} from "react-router-dom";
import axios from "axios";


function JobDetails(){

const {id}=useParams();

const [job,setJob]=useState(null);


useEffect(()=>{

axios.get(`http://localhost:5000/jobs/${id}`)
.then(res=>setJob(res.data));

},[id]);


if(!job){

return <div>Loading job details...</div>;

}

return(

<div>

<h1>{job.title}</h1>

<h3>Company : {job.company}</h3>

<p>
{job.description}
</p>


<form>

<input placeholder="Name"/>

<br/>

<input placeholder="Email"/>

<br/>

<input type="file"/>


<br/>

<button>
Apply Job
</button>


</form>


</div>

)

}


export default JobDetails;