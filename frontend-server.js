const http=require("http");
const fs=require("fs");
const path=require("path");


const filePath=path.join(__dirname,"index.html");


http.createServer((req,res)=>{

const html=fs.readFileSync(filePath,"utf8");

res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});
res.end(html);

}).listen(3000,()=>{

console.log("Frontend running on http://localhost:3000");

});