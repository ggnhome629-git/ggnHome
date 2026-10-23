const assert=require("assert");const {execFileSync,spawnSync}=require("child_process");
const {MongoMemoryServer}=require("mongodb-memory-server");const {MongoClient}=require("mongodb");
(async()=>{
 const srv=await Promise.all([1,2,3].map(()=>MongoMemoryServer.create()));const u=srv.map(s=>s.getUri()+"app");
 const cs=await Promise.all(u.map(x=>new MongoClient(x).connect()));const d=cs.map(c=>c.db());
 await d[0].collection("users").createIndex({phone:1},{unique:true});
 await d[0].collection("users").insertMany([{phone:"1"}]);
 await d[1].collection("users").insertMany([{phone:"2"},{phone:"1"}]); // phone 1 clashes
 await d[1].collection("props").insertMany(Array.from({length:1200},(_,i)=>({n:i})));
 await d[2].collection("props").insertMany([{n:"x"}]);
 const fixed=new (require("mongodb").ObjectId)(); await d[0].collection("notes").insertOne({_id:fixed,t:"target"}); await d[1].collection("notes").insertOne({_id:fixed,t:"source-different"});
 const env={...process.env,MONGO_URI:u[0],MONGO_URI_2:u[1],MONGO_URI_3:u[2]};
 const run=a=>spawnSync("node",["/home/user/ggnHome/server/scripts/mergeDatabases.js",...a],{env,encoding:"utf8"});
 let r=run(["--from","2,3","--to","1"]);assert(/DRY RUN/.test(r.stdout));assert.equal(await d[0].collection("props").countDocuments(),0);
 r=run(["--from","2,3","--to","1","--apply","--delete-source"]);console.log(r.stdout,r.stderr);
 assert.equal(await d[0].collection("props").countDocuments(),1201);
 assert.equal(await d[0].collection("users").countDocuments(),2);
 assert.equal(await d[1].collection("users").countDocuments(),1); // the clash stays in source, nothing lost
 assert.equal(await d[1].collection("props").countDocuments(),0);
 assert.equal(await d[1].collection("notes").countDocuments(),1); assert.equal((await d[0].collection("notes").findOne({_id:fixed})).t,"target"); // nothing overwritten, nothing deleted
 assert(/DIFFERENT/.test(r.stdout)&&/Backup of everything/.test(r.stdout));
 const fs=require("fs");const dir=r.stdout.match(/removed from the sources: (.*)/)[1];assert(fs.readdirSync(dir).length>=2);
 r=run(["--from","2,3","--to","1","--apply"]);assert.equal(r.status===0||r.status===2,true); // re-run is safe
 assert.equal(await d[0].collection("props").countDocuments(),1201);
 console.log("MERGE PASS");process.exit(0);
})().catch(e=>{console.error("FAIL",e);process.exit(1)});
