import React from "react";
import {useState} from "react";
import axios from "axios";


function Dashboard(){

const [title,setTitle]=useState("");
const [company,setCompany]=useState("");
const [location,setLocation]=useState("");
const [description,setDescription]=useState("");
const [salary,setSalary]=useState("");


const postJob=(event)=>{

event.preventDefault();

axios.post("http://localhost:5000/jobs",{
title,
company,
location,
description,
salary
})
.then(()=>{
setTitle("");
setCompany("");
setLocation("");
setDescription("");
setSalary("");
alert("Job Posted");
});

}

return(

<div>


<h1>Dashboard</h1>


<h2>Candidate Profile</h2>

<p>
Manage profile and applications
</p>


<h2>Employer</h2>

<form onSubmit={postJob}>

<input placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)}/>
<br/>
<input placeholder="Company" value={company} onChange={(e)=>setCompany(e.target.value)}/>
<br/>
<input placeholder="Location" value={location} onChange={(e)=>setLocation(e.target.value)}/>
<br/>
<input placeholder="Salary" value={salary} onChange={(e)=>setSalary(e.target.value)}/>
<br/>
<textarea placeholder="Description" value={description} onChange={(e)=>setDescription(e.target.value)}></textarea>
<br/>
<button type="submit">
Post New Job
</button>

</form>


</div>


)

}


export default Dashboard;