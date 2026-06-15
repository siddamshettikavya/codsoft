const express=require("express");
const mongoose=require("mongoose");
const cors=require("cors");
const helmet=require("helmet");
const rateLimit=require("express-rate-limit");
const multer=require("multer");
const bcrypt=require("bcryptjs");
const jwt=require("jsonwebtoken");
const nodemailer=require("nodemailer");
const fs=require("fs");
const path=require("path");
const {randomUUID}=require("crypto");

const Job=require("./models/Job");
const User=require("./models/User");
const Application=require("./models/Application");
const Notification=require("./models/Notification");

const app=express();
const PORT=Number(process.env.PORT||5000);
const JWT_SECRET=process.env.JWT_SECRET||"demo-job-board-secret";
const mongoUri=process.env.MONGO_URI||"mongodb://127.0.0.1:27017/jobboard";
const uploadsDir=path.join(__dirname,"uploads");
const authLimiter=rateLimit({windowMs:15*60*1000,max:30});

fs.mkdirSync(uploadsDir,{recursive:true});

const upload=multer({
	storage:multer.diskStorage({
		destination:uploadsDir,
		filename:(req,file,cb)=>{
			const safeName=file.originalname.replace(/[^a-zA-Z0-9_.-]/g,"_");
			cb(null,`${Date.now()}-${safeName}`);
		}
	}),
	limits:{fileSize:5*1024*1024}
});

app.use(helmet({contentSecurityPolicy:false}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use("/uploads",express.static(uploadsDir));

let useMemoryStore=false;
let memorySeeded=false;
let memoryJobs=[];
let memoryUsers=[];
let memoryApplications=[];
let memoryNotifications=[];

const emailTransport=process.env.SMTP_HOST
	? nodemailer.createTransport({
			host:process.env.SMTP_HOST,
			port:Number(process.env.SMTP_PORT||587),
			secure:String(process.env.SMTP_SECURE||"false")==="true",
			auth:process.env.SMTP_USER
				? {user:process.env.SMTP_USER,pass:process.env.SMTP_PASS||""}
				: undefined
		})
	: null;

function shouldUseMemoryStore(){
	return useMemoryStore||mongoose.connection.readyState!==1;
}

function publicUser(user){
	if(!user){
		return null;
	}

	const plain=user.toObject?user.toObject():user;
	const {passwordHash,...safeUser}=plain;
	return safeUser;
}

function signToken(user){
	return jwt.sign(
		{id:user._id.toString(),email:user.email,role:user.role,name:user.name},
		JWT_SECRET,
		{expiresIn:"7d"}
	);
}

function authRequired(req,res,next){
	const header=req.headers.authorization||"";
	const token=header.startsWith("Bearer ")?header.slice(7):"";

	if(!token){
		return res.status(401).json({message:"Missing authentication token"});
	}

	try{
		req.auth=jwt.verify(token,JWT_SECRET);
		return next();
	}
	catch(error){
		return res.status(401).json({message:"Invalid or expired token"});
	}
}

async function sendEmailNotification(to,subject,text){
	if(!to){
		return {status:"skipped"};
	}

	if(!emailTransport){
		console.log(`[email] ${to} | ${subject} | ${text}`);
		return {status:"queued"};
	}

	await emailTransport.sendMail({
		from:process.env.SMTP_FROM||"noreply@jobboard.local",
		to,
		subject,
		text
	});

	return {status:"sent"};
}

async function createNotification(userId,type,message){
	if(!userId){
		return null;
	}

	if(shouldUseMemoryStore()){
		const notification={
			_id:randomUUID(),
			userId,
			type,
			message,
			read:false,
			createdAt:new Date()
		};

		memoryNotifications.unshift(notification);
		return notification;
	}

	return Notification.create({userId,type,message});
}

function seedMemoryData(){
	if(memorySeeded){
		return;
	}

	memorySeeded=true;
	const employerId=randomUUID();
	const candidateId=randomUUID();

	memoryUsers=[
		{
			_id:employerId,
			name:"Demo Employer",
			email:"employer@demo.com",
			passwordHash:bcrypt.hashSync("demo123",10),
			role:"employer",
			bio:"Hiring for product, design, and engineering roles.",
			skills:[],
			location:"Remote",
			createdAt:new Date()
		},
		{
			_id:candidateId,
			name:"Demo Candidate",
			email:"candidate@demo.com",
			passwordHash:bcrypt.hashSync("demo123",10),
			role:"candidate",
			bio:"Open to frontend, backend, and full-stack roles.",
			skills:["React","Node.js","MongoDB"],
			location:"Hybrid",
			createdAt:new Date()
		}
	];

	memoryJobs=[
		{
			_id:randomUUID(),
			title:"Senior React Developer",
			company:"Northstar Labs",
			location:"Remote",
			type:"Full-time",
			salary:"$110k - $140k",
			category:"Frontend",
			description:"Build accessible, responsive product experiences with React and modern tooling.",
			employerId,
			employerName:"Demo Employer",
			employerEmail:"employer@demo.com",
			createdAt:new Date(Date.now()-1000*60*60*24*4)
		},
		{
			_id:randomUUID(),
			title:"Node.js API Engineer",
			company:"Skyline Systems",
			location:"Bangalore",
			type:"Hybrid",
			salary:"₹14L - ₹20L",
			category:"Backend",
			description:"Design secure APIs, implement data models, and improve delivery pipelines.",
			employerId,
			employerName:"Demo Employer",
			employerEmail:"employer@demo.com",
			createdAt:new Date(Date.now()-1000*60*60*24*2)
		},
		{
			_id:randomUUID(),
			title:"Product Designer",
			company:"Pixel Harbor",
			location:"Mumbai",
			type:"On-site",
			salary:"₹10L - ₹16L",
			category:"Design",
			description:"Shape polished mobile and web flows with a product-first mindset.",
			employerId,
			employerName:"Demo Employer",
			employerEmail:"employer@demo.com",
			createdAt:new Date(Date.now()-1000*60*60*24)
		}
	];

	memoryApplications=[
		{
			_id:randomUUID(),
			jobId:memoryJobs[0]._id,
			applicantId:candidateId,
			applicantName:"Demo Candidate",
			applicantEmail:"candidate@demo.com",
			coverLetter:"I would love to work on React products.",
			resumeName:"demo-candidate-resume.pdf",
			resumePath:"",
			status:"Submitted",
			createdAt:new Date(Date.now()-1000*60*30)
		}
	];

	memoryNotifications=[
		{
			_id:randomUUID(),
			userId:candidateId,
			type:"success",
			message:"Your demo application was submitted successfully.",
			read:false,
			createdAt:new Date(Date.now()-1000*60*25)
		},
		{
			_id:randomUUID(),
			userId:employerId,
			type:"info",
			message:"You have 1 new application waiting in the employer dashboard.",
			read:false,
			createdAt:new Date(Date.now()-1000*60*20)
		}
	];
}

async function seedMongoData(){
	const [employerExists,candidateExists,jobCount]=await Promise.all([
		User.findOne({email:"employer@demo.com"}),
		User.findOne({email:"candidate@demo.com"}),
		Job.countDocuments()
	]);

	const employer=employerExists||await User.create({
		name:"Demo Employer",
		email:"employer@demo.com",
		passwordHash:bcrypt.hashSync("demo123",10),
		role:"employer",
		bio:"Hiring for product, design, and engineering roles.",
		skills:[],
		location:"Remote"
	});

	const candidate=candidateExists||await User.create({
		name:"Demo Candidate",
		email:"candidate@demo.com",
		passwordHash:bcrypt.hashSync("demo123",10),
		role:"candidate",
		bio:"Open to frontend, backend, and full-stack roles.",
		skills:["React","Node.js","MongoDB"],
		location:"Hybrid"
	});

	if(jobCount===0){
		const seedJobs=[
			{
				title:"Senior React Developer",
				company:"Northstar Labs",
				location:"Remote",
				type:"Full-time",
				salary:"$110k - $140k",
				category:"Frontend",
				description:"Build accessible, responsive product experiences with React and modern tooling.",
				employerId:employer._id.toString(),
				employerName:employer.name,
				employerEmail:employer.email
			},
			{
				title:"Node.js API Engineer",
				company:"Skyline Systems",
				location:"Bangalore",
				type:"Hybrid",
				salary:"₹14L - ₹20L",
				category:"Backend",
				description:"Design secure APIs, implement data models, and improve delivery pipelines.",
				employerId:employer._id.toString(),
				employerName:employer.name,
				employerEmail:employer.email
			},
			{
				title:"Product Designer",
				company:"Pixel Harbor",
				location:"Mumbai",
				type:"On-site",
				salary:"₹10L - ₹16L",
				category:"Design",
				description:"Shape polished mobile and web flows with a product-first mindset.",
				employerId:employer._id.toString(),
				employerName:employer.name,
				employerEmail:employer.email
			}
		];

		await Job.insertMany(seedJobs);
	}

	const firstJob=await Job.findOne({title:"Senior React Developer"});
	const applicationCount=await Application.countDocuments();

	if(firstJob&&applicationCount===0){
		await Application.create({
			jobId:firstJob._id.toString(),
			applicantId:candidate._id.toString(),
			applicantName:candidate.name,
			applicantEmail:candidate.email,
			coverLetter:"I would love to work on React products.",
			resumeName:"demo-candidate-resume.pdf",
			resumePath:"",
			status:"Submitted"
		});
	}

	const notificationCount=await Notification.countDocuments();
	if(notificationCount===0){
		await Notification.create([
			{
				userId:candidate._id.toString(),
				type:"success",
				message:"Your demo application was submitted successfully."
			},
			{
				userId:employer._id.toString(),
				type:"info",
				message:"You have 1 new application waiting in the employer dashboard."
			}
		]);
	}
}

function normalizeJob(job){
	const plain=job.toObject?job.toObject():job;
	return {
		...plain,
		salary:plain.salary||"",
		type:plain.type||"Full-time",
		category:plain.category||"General"
	};
}

async function listJobs(searchText=""){
	const search=searchText.trim();

	if(shouldUseMemoryStore()){
		const filtered=memoryJobs.filter((job)=>{
			if(!search){
				return true;
			}

			const haystack=[job.title,job.company,job.location,job.description,job.category,job.type].join(" ").toLowerCase();
			return haystack.includes(search.toLowerCase());
		});

		return filtered.map((job)=>({...job}));
	}

	const mongoQuery=search
		? {
				$or:[
					{title:new RegExp(search,"i")},
					{company:new RegExp(search,"i")},
					{location:new RegExp(search,"i")},
					{description:new RegExp(search,"i")},
					{category:new RegExp(search,"i")},
					{type:new RegExp(search,"i")}
				]
			}
		: {};

	const jobs=await Job.find(mongoQuery).sort({createdAt:-1});
	return jobs.map(normalizeJob);
}

async function getJobById(id){
	if(shouldUseMemoryStore()){
		return memoryJobs.find((job)=>job._id===id)||null;
	}

	const job=await Job.findById(id);
	return job?normalizeJob(job):null;
}

async function findUserByEmail(email){
	if(shouldUseMemoryStore()){
		return memoryUsers.find((user)=>user.email.toLowerCase()===email.toLowerCase())||null;
	}

	return User.findOne({email:email.toLowerCase()});
}

async function findUserById(id){
	if(shouldUseMemoryStore()){
		return memoryUsers.find((user)=>user._id===id)||null;
	}

	return User.findById(id);
}

async function saveUser(user){
	if(shouldUseMemoryStore()){
		const index=memoryUsers.findIndex((item)=>item._id===user._id);
		const safeUser=user.toObject?user.toObject():user;

		if(index>=0){
			memoryUsers[index]={...memoryUsers[index],...safeUser};
			return memoryUsers[index];
		}

		memoryUsers.push(safeUser);
		return safeUser;
	}

	return user.save();
}

async function createJob(data){
	if(shouldUseMemoryStore()){
		const job={
			_id:randomUUID(),
			...data,
			createdAt:new Date()
		};

		memoryJobs.unshift(job);
		return job;
	}

	const job=await Job.create(data);
	return normalizeJob(job);
}

async function saveApplication(data){
	if(shouldUseMemoryStore()){
		const application={
			_id:randomUUID(),
			...data,
			createdAt:new Date()
		};

		memoryApplications.unshift(application);
		return application;
	}

	const application=await Application.create(data);
	return application.toObject();
}

async function listApplicationsForUser(user){
	if(shouldUseMemoryStore()){
		if(user.role==="employer"){
			const employerJobs=memoryJobs.filter((job)=>job.employerId===user._id).map((job)=>job._id);
			return memoryApplications.filter((application)=>employerJobs.includes(application.jobId));
		}

		return memoryApplications.filter((application)=>application.applicantId===user._id);
	}

	if(user.role==="employer"){
		const employerJobs=await Job.find({employerId:user._id.toString()}).select("_id");
		const jobIds=employerJobs.map((job)=>job._id.toString());
		const applications=await Application.find({jobId:{$in:jobIds}}).sort({createdAt:-1});
		return applications.map((application)=>application.toObject());
	}

	const applications=await Application.find({applicantId:user._id.toString()}).sort({createdAt:-1});
	return applications.map((application)=>application.toObject());
}

async function listNotificationsForUser(userId){
	if(shouldUseMemoryStore()){
		return memoryNotifications.filter((notification)=>notification.userId===userId);
	}

	const notifications=await Notification.find({userId}).sort({createdAt:-1});
	return notifications.map((notification)=>notification.toObject());
}

mongoose.connect(mongoUri)
	.then(async()=>{
		console.log("MongoDB connected");
		await seedMongoData();
	})
	.catch((error)=>{
		useMemoryStore=true;
		console.error("MongoDB connection failed, using in-memory store:",error.message);
		seedMemoryData();
	});

app.get("/api/health",(req,res)=>{
	res.json({ok:true,memory:shouldUseMemoryStore(),mongodbReady:mongoose.connection.readyState===1});
});

app.get("/api/jobs",async(req,res,next)=>{
	try{
		const jobs=await listJobs(req.query.search||"");
		res.json(jobs);
	}
	catch(error){
		next(error);
	}
});

app.get("/api/jobs/:id",async(req,res,next)=>{
	try{
		const job=await getJobById(req.params.id);

		if(!job){
			return res.status(404).json({message:"Job not found"});
		}

		return res.json(job);
	}
	catch(error){
		next(error);
	}
});

app.post("/api/auth/register",authLimiter,async(req,res,next)=>{
	try{
		const {name,email,password,role="candidate"}=req.body;

		if(!name||!email||!password){
			return res.status(400).json({message:"Name, email, and password are required"});
		}

		const existingUser=await findUserByEmail(email);
		if(existingUser){
			return res.status(409).json({message:"Email already in use"});
		}

		const passwordHash=await bcrypt.hash(password,10);
		const userData={
			_id:randomUUID(),
			name,
			email:email.toLowerCase(),
			passwordHash,
			role:role==="employer"?"employer":"candidate",
			bio:"",
			skills:[],
			location:"",
			createdAt:new Date()
		};

		const user=shouldUseMemoryStore()
			? (memoryUsers.push(userData),userData)
			: await User.create(userData);

		await createNotification(userData._id,"success","Your account was created successfully.");
		const token=signToken(user);
		res.status(201).json({token,user:publicUser(user)});
	}
	catch(error){
		next(error);
	}
});

app.post("/api/auth/login",authLimiter,async(req,res,next)=>{
	try{
		const {email,password}=req.body;

		if(!email||!password){
			return res.status(400).json({message:"Email and password are required"});
		}

		const user=await findUserByEmail(email);
		if(!user){
			return res.status(401).json({message:"Invalid credentials"});
		}

		const valid=await bcrypt.compare(password,user.passwordHash);
		if(!valid){
			return res.status(401).json({message:"Invalid credentials"});
		}

		const token=signToken(user);
		res.json({token,user:publicUser(user)});
	}
	catch(error){
		next(error);
	}
});

app.get("/api/me",authRequired,async(req,res,next)=>{
	try{
		const user=await findUserById(req.auth.id);

		if(!user){
			return res.status(404).json({message:"User not found"});
		}

		const applications=await listApplicationsForUser(user);
		const jobs=await listJobs("");
		const postedJobs=user.role==="employer"
			? jobs.filter((job)=>job.employerId===user._id.toString())
			: [];

		return res.json({
			user:publicUser(user),
			stats:{
				jobsPosted:postedJobs.length,
				applications:applications.length,
				notifications:(await listNotificationsForUser(user._id.toString())).length
			}
		});
	}
	catch(error){
		next(error);
	}
});

app.put("/api/me",authRequired,async(req,res,next)=>{
	try{
		const user=await findUserById(req.auth.id);

		if(!user){
			return res.status(404).json({message:"User not found"});
		}

		const {name,bio,skills,location}=req.body;
		user.name=name||user.name;
		user.bio=bio!==undefined?bio:user.bio;
		user.location=location!==undefined?location:user.location;
		user.skills=Array.isArray(skills)
			? skills
			: typeof skills==="string" && skills.trim()
				? skills.split(",").map((item)=>item.trim()).filter(Boolean)
				: user.skills;

		const saved=await saveUser(user);
		res.json({user:publicUser(saved),message:"Profile updated"});
	}
	catch(error){
		next(error);
	}
});

app.post("/api/jobs",async(req,res,next)=>{
	try{
		const {title,company,location,salary="",description,type="Full-time",category="General"}=req.body;

		if(!title||!company||!location||!description){
			return res.status(400).json({message:"Title, company, location, and description are required"});
		}

		let employerName="Demo Employer";
		let employerEmail="employer@demo.com";
		let employerId="";

		const header=req.headers.authorization||"";
		const token=header.startsWith("Bearer ")?header.slice(7):"";

		if(token){
			try{
				const auth=jwt.verify(token,JWT_SECRET);
				const user=await findUserById(auth.id);

				if(user&&user.role==="employer"){
					employerName=user.name;
					employerEmail=user.email;
					employerId=user._id.toString();
				}
			}
			catch(error){
				// Demo posting still works without auth.
			}
		}

		const job=await createJob({
			title,
			company,
			location,
			salary,
			description,
			type,
			category,
			employerId,
			employerName,
			employerEmail
		});

		if(employerId){
			await createNotification(employerId,"info",`Your job posting \"${title}\" is now live.`);
		}

		return res.status(201).json(job);
	}
	catch(error){
		next(error);
	}
});

app.get("/api/applications",authRequired,async(req,res,next)=>{
	try{
		const user=await findUserById(req.auth.id);

		if(!user){
			return res.status(404).json({message:"User not found"});
		}

		const applications=await listApplicationsForUser(user);
		res.json(applications);
	}
	catch(error){
		next(error);
	}
});

app.post("/api/applications",upload.single("resume"),async(req,res,next)=>{
	try{
		const {jobId,applicantName,applicantEmail,coverLetter="",candidateId=""}=req.body;

		if(!jobId||!applicantName||!applicantEmail){
			return res.status(400).json({message:"Job, name, and email are required"});
		}

		const job=await getJobById(jobId);
		if(!job){
			return res.status(404).json({message:"Job not found"});
		}

		const application=await saveApplication({
			jobId,
			applicantId:candidateId||"",
			applicantName,
			applicantEmail,
			coverLetter,
			resumeName:req.file?req.file.originalname:"",
			resumePath:req.file?`/uploads/${req.file.filename}`:"",
			status:"Submitted"
		});

		const applicantUser=shouldUseMemoryStore()
			? memoryUsers.find((user)=>user.email.toLowerCase()===applicantEmail.toLowerCase())
			: await User.findOne({email:applicantEmail.toLowerCase()});

		const employerId=job.employerId||"";
		const employerUser=employerId
			? await findUserById(employerId)
			: null;

		const confirmationMessage=`Your application for ${job.title} at ${job.company} was submitted successfully.`;
		const employerMessage=`${applicantName} applied for ${job.title} at ${job.company}.`;

		await createNotification(applicantUser?._id?.toString()||candidateId||applicantEmail,"success",confirmationMessage);
		if(employerUser){
			await createNotification(employerUser._id.toString(),"info",employerMessage);
		}

		await sendEmailNotification(applicantEmail,`Application received: ${job.title}`,confirmationMessage);
		if(employerUser?.email){
			await sendEmailNotification(employerUser.email,`New applicant for ${job.title}`,employerMessage);
		}

		return res.status(201).json({
			application,
			message:"Application submitted successfully",
			emailStatus:"queued"
		});
	}
	catch(error){
		next(error);
	}
});

app.get("/api/notifications",authRequired,async(req,res,next)=>{
	try{
		const notifications=await listNotificationsForUser(req.auth.id);
		res.json(notifications);
	}
	catch(error){
		next(error);
	}
});

app.use((error,req,res,next)=>{
	console.error(error);
	res.status(500).json({message:"Internal server error"});
});

mongoose.connect(mongoUri)
	.then(async()=>{
		console.log("MongoDB connected");
		await seedMongoData();
	})
	.catch((error)=>{
		useMemoryStore=true;
		console.error("MongoDB connection failed, using in-memory store:",error.message);
		seedMemoryData();
	});

app.listen(PORT,()=>{
	console.log(`Server running on http://localhost:${PORT}`);
});