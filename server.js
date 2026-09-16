const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const db = new DatabaseSync(path.join(__dirname, 'ratedly.db'));
db.exec(`PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, category TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY, item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5), text TEXT NOT NULL CHECK(length(text) BETWEEN 1 AND 500), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(item_id, user_id));
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);`);
try { db.exec('ALTER TABLE users ADD COLUMN age INTEGER'); } catch { /* column already exists */ }
// Curated India-wide starter catalogue (Delhi plus other major cities). Reviews below are clearly labelled demo content, not Google reviews.
db.prepare("DELETE FROM items WHERE name IN ('Harbor & Hearth','Kindred Notes','Daybreak')").run();
const indiaPlaces=[
  // Delhi
  ['India Gate','Monument · Central Delhi'],['Qutub Minar','UNESCO monument · Mehrauli, Delhi'],['Red Fort','UNESCO monument · Old Delhi'],["Humayun's Tomb",'UNESCO monument · Nizamuddin, Delhi'],['Lotus Temple','Baháʼí House of Worship · Kalkaji, Delhi'],['Swaminarayan Akshardham','Temple complex · Pandav Nagar, Delhi'],['Lodhi Garden','Park and heritage site · Lodhi Road, Delhi'],['Gurudwara Bangla Sahib','Gurudwara · Connaught Place, Delhi'],['Jama Masjid','Mosque · Old Delhi'],['Dilli Haat INA','Craft and food market · INA, Delhi'],['Sunder Nursery','Park and heritage garden · Nizamuddin, Delhi'],['Garden of Five Senses','Park · Saket, Delhi'],['Nexus Select CityWalk','Mall · Saket, Delhi'],['DLF Promenade','Mall · Vasant Kunj, Delhi'],['Khan Market','Market and restaurants · Khan Market, Delhi'],['Indian Accent','Fine dining restaurant · Lodhi Road, Delhi'],['Bukhara','North Indian restaurant · Chanakyapuri, Delhi'],['Saravana Bhavan','South Indian restaurant · Connaught Place, Delhi'],['Hauz Khas Village','Lakefront cafes and heritage · Hauz Khas, Delhi'],['Connaught Place','Shopping, cafes and culture · New Delhi'],
  // Agra
  ['Taj Mahal','UNESCO monument · Agra'],['Agra Fort','UNESCO monument · Agra'],
  // Jaipur
  ['Hawa Mahal','Palace · Jaipur'],['Amber Fort','Fort · Jaipur'],['City Palace Jaipur','Palace · Jaipur'],
  // Mumbai
  ['Gateway of India','Monument · Mumbai'],['Marine Drive','Promenade · Mumbai'],['Chhatrapati Shivaji Maharaj Vastu Sangrahalaya','Museum · Mumbai'],['Elephanta Caves','UNESCO monument · Mumbai'],
  // Agra/Punjab
  ['Golden Temple','Gurudwara · Amritsar'],['Wagah Border','Landmark · Amritsar'],
  // South India
  ['Meenakshi Amman Temple','Temple · Madurai'],['Marina Beach','Beach · Chennai'],['Mysore Palace','Palace · Mysore'],['Charminar','Monument · Hyderabad'],['Golconda Fort','Fort · Hyderabad'],['Backwaters of Alleppey','Nature and boating · Kerala'],
  // East India
  ['Victoria Memorial','Monument · Kolkata'],['Howrah Bridge','Landmark · Kolkata'],['Kashi Vishwanath Temple','Temple · Varanasi'],
  // Goa
  ['Baga Beach','Beach · Goa'],['Basilica of Bom Jesus','UNESCO monument · Goa'],
  // Kashmir
  ['Dal Lake','Lake and houseboats · Srinagar']
];
for (const [name,category] of indiaPlaces) db.prepare('INSERT OR IGNORE INTO items(name,category) VALUES (?,?)').run(name,category);
const demoPeople=[['Aarav Mehta','aarav.demo@ratedly.local',24],['Ananya Kapoor','ananya.demo@ratedly.local',31],['Rohan Sharma','rohan.demo@ratedly.local',45],['Meera Iyer','meera.demo@ratedly.local',19],['Kabir Singh','kabir.demo@ratedly.local',52],['Priya Nair','priya.demo@ratedly.local',27],['Devika Rao','devika.demo@ratedly.local',38],['Arjun Malhotra','arjun.demo@ratedly.local',60],['Ishita Bose','ishita.demo@ratedly.local',22],['Vikram Desai','vikram.demo@ratedly.local',41],['Sneha Pillai','sneha.demo@ratedly.local',29],['Farhan Khan','farhan.demo@ratedly.local',35],['Ritu Chawla','ritu.demo@ratedly.local',58],['Aditya Verma','aditya.demo@ratedly.local',20],['Lakshmi Menon','lakshmi.demo@ratedly.local',66],['Yusuf Ansari','yusuf.demo@ratedly.local',33],['Nandini Reddy','nandini.demo@ratedly.local',48],['Karan Kohli','karan.demo@ratedly.local',26]];
for(const [name,email,age] of demoPeople) db.prepare('INSERT OR IGNORE INTO users(name,email,password_hash,age) VALUES (?,?,?,?)').run(name,email,'demo-seed-account',age);
for(const [,email,age] of demoPeople) db.prepare('UPDATE users SET age=? WHERE email=? AND age IS NULL').run(age,email);
const demoReviews=[['India Gate','Aarav Mehta',5,'Great for an early-evening walk. The open views make it an easy first stop in Delhi.'],['India Gate','Meera Iyer',4,'A classic landmark. I would plan extra time for crowds and photos.'],['Qutub Minar','Ananya Kapoor',5,'The complex has remarkable details, so I enjoyed taking my time instead of rushing through it.'],['Qutub Minar','Kabir Singh',4,'A memorable heritage visit. Going earlier in the day made the experience more relaxed.'],['Red Fort','Rohan Sharma',4,'The scale and history are impressive. A good choice if you are exploring Old Delhi.'],["Humayun's Tomb",'Priya Nair',5,'The gardens and symmetry made this feel calm and beautifully designed.'],['Lotus Temple','Meera Iyer',4,'A peaceful stop with a distinctive design. Quiet time here was the highlight for me.'],['Swaminarayan Akshardham','Aarav Mehta',5,'The craftsmanship and scale are striking. I would allow a generous amount of time.'],['Lodhi Garden','Ananya Kapoor',5,'Lovely for a morning stroll, with greenery and historic structures together.'],['Gurudwara Bangla Sahib','Kabir Singh',5,'A serene and welcoming place. I visited respectfully and found it very calming.'],['Jama Masjid','Rohan Sharma',4,'The setting is impressive and full of character. It pairs well with an Old Delhi walk.'],['Dilli Haat INA','Priya Nair',4,'A fun place to browse crafts and sample different regional food options.'],['Taj Mahal','Rohan Sharma',5,'Every angle feels iconic. Arriving near sunrise made it far less crowded.'],['Gateway of India','Ananya Kapoor',4,'A lively waterfront landmark. Worth pairing with a short harbour boat ride.'],['Hawa Mahal','Priya Nair',4,'The facade is stunning in the morning light. The inside is smaller than expected.'],['Golden Temple','Kabir Singh',5,'An incredibly peaceful experience, and the community kitchen was moving to see.'],['Marina Beach','Meera Iyer',4,'A great place for an evening walk, though it does get crowded on weekends.'],['Charminar','Aarav Mehta',4,'The old-city energy around it is part of the experience, especially the nearby markets.'],
  ['Sunder Nursery','Devika Rao',5,'A quiet, well-kept garden right next to the Humayun Tomb complex. Great for photography.'],
  ['Garden of Five Senses','Aditya Verma',4,'Nice landscaping and a relaxed vibe, good for an evening out with friends.'],
  ['Nexus Select CityWalk','Sneha Pillai',4,'A dependable mall with a good mix of shops and food options.'],
  ['DLF Promenade','Farhan Khan',4,'Upscale and spacious, though it can get crowded on weekend evenings.'],
  ['Khan Market','Ritu Chawla',4,'Charming lanes with a good variety of boutiques and cafes, if a bit pricey.'],
  ['Indian Accent','Vikram Desai',5,'Inventive modern Indian food. Worth booking ahead, especially on weekends.'],
  ['Bukhara','Lakshmi Menon',5,'Rich, smoky kebabs and dal that live up to the reputation. Go hungry.'],
  ['Saravana Bhavan','Yusuf Ansari',4,'Consistent South Indian food, quick service, and good value for the quality.'],
  ['Hauz Khas Village','Nandini Reddy',4,'A lively mix of cafes and boutiques by the lake, best visited around sunset.'],
  ['Connaught Place','Karan Kohli',4,'Classic Delhi shopping and food, easy to spend a whole afternoon here.'],
  ['Agra Fort','Ishita Bose',5,'Just as impressive as the Taj, with fewer crowds and great river views.'],
  ['Amber Fort','Arjun Malhotra',5,'Stunning architecture on the hillside; the elephant queue can be long, so plan ahead.'],
  ['City Palace Jaipur',"Meera Iyer",4,'A colourful blend of Rajasthani and Mughal styles, worth a guided tour.'],
  ['Marine Drive','Priya Nair',4,'A lovely sunset walk along the bay, especially with street snacks in hand.'],
  ['Chhatrapati Shivaji Maharaj Vastu Sangrahalaya','Kabir Singh',4,'A well-curated museum with an impressive art and history collection.'],
  ['Elephanta Caves',"Rohan Sharma",4,'The ferry ride and rock-cut sculptures make for a memorable half-day trip.'],
  ['Wagah Border','Ananya Kapoor',5,'The evening ceremony has incredible energy. Arrive early to get a good seat.'],
  ['Meenakshi Amman Temple','Devika Rao',5,'The temple towers are breathtaking, and the atmosphere is truly special.'],
  ['Mysore Palace','Aditya Verma',5,'Even more striking when lit up in the evening. Well worth the visit.'],
  ['Golconda Fort','Sneha Pillai',4,'Great views from the top and interesting acoustics throughout the fort.'],
  ['Backwaters of Alleppey','Farhan Khan',5,'A peaceful houseboat ride through the backwaters was the highlight of my trip.'],
  ['Victoria Memorial','Ritu Chawla',4,'Beautiful grounds and architecture, a nice spot for a slow afternoon.'],
  ['Howrah Bridge','Vikram Desai',4,'Iconic and bustling. Best viewed from a boat on the river at dusk.'],
  ['Kashi Vishwanath Temple','Lakshmi Menon',5,'A deeply moving experience, especially during the evening aarti by the ghats.'],
  ['Baga Beach','Yusuf Ansari',4,'Fun and lively with plenty of shacks nearby, though it gets busy by afternoon.'],
  ['Basilica of Bom Jesus','Nandini Reddy',5,'A striking piece of history with real architectural detail, quieter than the beaches.'],
  ['Dal Lake','Karan Kohli',5,'A calm houseboat stay with beautiful views, especially early in the morning.']];
for(const [itemName,userName,score,text] of demoReviews){const item=db.prepare('SELECT id FROM items WHERE name=?').get(itemName),user=db.prepare('SELECT id FROM users WHERE name=?').get(userName);if(item&&user)db.prepare('INSERT OR IGNORE INTO reviews(item_id,user_id,score,text) VALUES (?,?,?,?)').run(item.id,user.id,score,text)}

// Bulk demo reviewer pool + popularity-scaled review generation, so every place has 50-100 reviews.
(function seedBulkReviews(){
  const firstNames=['Aarav','Vivaan','Aditya','Vihaan','Arjun','Reyansh','Sai','Krishna','Ishaan','Rohan','Karan','Yash','Aryan','Devansh','Rudra','Kabir','Farhan','Yusuf','Zaid','Imran','Ananya','Diya','Ira','Myra','Aadhya','Kiara','Anika','Navya','Saanvi','Pari','Priya','Sneha','Neha','Pooja','Ritu','Kavya','Meera','Divya','Nisha','Shreya','Isha','Tanya','Simran','Gurpreet','Harpreet','Manpreet','Rajesh','Suresh','Ramesh','Mahesh','Ganesh','Vijay','Ajay','Sanjay','Deepak','Anil','Sunil','Vinod','Ashok','Rakesh','Lakshmi','Radha','Sita','Geeta','Sunita','Anita','Kamala','Usha','Rekha','Sarita','Manoj','Vinay','Naveen','Praveen','Sandeep','Pradeep','Kunal','Nikhil','Rahul','Amit','Vikash','Vishal','Gaurav','Saurabh','Abhishek','Siddharth','Varun','Tarun','Arun','Kiran','Preeti','Shalini','Swati','Ruchi','Payal','Jyoti'];
  const lastNames=['Sharma','Verma','Gupta','Kumar','Singh','Patel','Shah','Mehta','Kapoor','Malhotra','Chopra','Khanna','Bhatia','Arora','Nair','Menon','Pillai','Iyer','Rao','Reddy','Naidu','Chowdhury','Banerjee','Mukherjee','Sengupta','Bose','Das','Ghosh','Chatterjee','Roy','Ansari','Khan','Sheikh','Syed','Hussain','Desai','Joshi','Trivedi','Pandey','Mishra','Tiwari','Dubey','Saxena','Agarwal','Jain','Bansal','Goyal','Rastogi','Chauhan','Rathore','Yadav','Thakur','Bhatt','Kaul','Dutta','Sarkar','Chakraborty','Sinha','Pandit'];
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const rand=(lo,hi)=>Math.floor(Math.random()*(hi-lo+1))+lo;
  // Build ~150 unique reviewer accounts with random Indian names and random ages.
  const usedNames=new Set(), pool=[];
  while(pool.length<150){const name=`${pick(firstNames)} ${pick(lastNames)}`;if(usedNames.has(name))continue;usedNames.add(name);pool.push([name,`bulk${pool.length}@ratedly.local`,rand(18,70)]);}
  const insertUser=db.prepare('INSERT OR IGNORE INTO users(name,email,password_hash,age) VALUES (?,?,?,?)');
  for(const [name,email,age] of pool) insertUser.run(name,email,'demo-seed-account',age);
  const users=db.prepare("SELECT id FROM users WHERE email LIKE 'bulk%@ratedly.local'").all();
  // Popularity tiers decide the target review count per place.
  const highTier=new Set(['India Gate','Taj Mahal','Red Fort','Qutub Minar',"Humayun's Tomb",'Golden Temple','Gateway of India','Lotus Temple','Jama Masjid','Hawa Mahal','Amber Fort','Charminar','Marina Beach','Gurudwara Bangla Sahib','Swaminarayan Akshardham','Connaught Place']);
  const lowTier=new Set(['Sunder Nursery','Garden of Five Senses','Wagah Border','Basilica of Bom Jesus','Dal Lake','Howrah Bridge','Backwaters of Alleppey','City Palace Jaipur','Chhatrapati Shivaji Maharaj Vastu Sangrahalaya']);
  const openers=['Really enjoyed visiting','Had a great time at','Loved my experience at','Would definitely recommend','A must-visit spot,','Pleasantly surprised by','Great place to explore,','Worth the visit,','Had a wonderful time exploring','Highly recommend a visit to','Glad I made time for','So happy I stopped by'];
  const middles=['the atmosphere was wonderful.','it exceeded my expectations.','the history and architecture are stunning.','it was well maintained and clean.','the crowd was manageable on a weekday.','it offers a great experience for families.','photography opportunities were fantastic.','the local guides were very helpful.','it gets busy on weekends so plan ahead.','it was peaceful and beautifully kept.','the staff were friendly and helpful.','it was a bit crowded but still worth it.','it was quieter than I expected, in a good way.','the entry process was smooth and quick.'];
  const closers=['Would visit again.','Highly recommend it to first-time visitors.','A great addition to any India itinerary.','One of the better spots I have visited.','Perfect for a half-day trip.','Bring a camera, you will need it.','Go early to beat the crowds.',''];
  const scorePool=[5,5,5,5,4,4,4,3,3,2];
  const items=db.prepare('SELECT id,name FROM items').all();
  const insertReview=db.prepare('INSERT OR IGNORE INTO reviews(item_id,user_id,score,text) VALUES (?,?,?,?)');
  for(const item of items){
    const target=Math.min(100, highTier.has(item.name)?rand(88,100):lowTier.has(item.name)?rand(50,65):rand(65,85));
    const existing=db.prepare('SELECT user_id FROM reviews WHERE item_id=?').all(item.id);
    const existingIds=new Set(existing.map(r=>r.user_id));
    const need=target-existing.length;
    if(need<=0) continue;
    const available=users.filter(u=>!existingIds.has(u.id));
    for(let i=available.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[available[i],available[j]]=[available[j],available[i]];}
    for(const u of available.slice(0,need)){
      const text=`${pick(openers)} ${item.name}, ${pick(middles)} ${pick(closers)}`.trim();
      insertReview.run(item.id,u.id,pick(scorePool),text);
    }
  }
})();

function json(res, status, body) { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(body)); }
function readBody(req) { return new Promise((resolve,reject) => { let raw=''; req.on('data', c => { raw += c; if(raw.length > 1e6) reject(new Error('Request too large')); }); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } }); }); }
function passwordHash(password, salt = crypto.randomBytes(16).toString('hex')) { return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`; }
function verifyPassword(password, saved) { const [salt, expected] = saved.split(':'); const actual = crypto.scryptSync(password, salt, 64).toString('hex'); return crypto.timingSafeEqual(Buffer.from(actual,'hex'), Buffer.from(expected,'hex')); }
function userFor(req) { const token = (req.headers.authorization || '').replace(/^Bearer\s+/i,''); if (!token) return null; return db.prepare('SELECT u.id,u.name,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>?').get(token, Date.now()) || null; }
function requireUser(req,res) { const user=userFor(req); if(!user) { json(res,401,{error:'Sign in is required.'}); return null; } return user; }
function listItems(search='', minRating='', category='', sort='') { const clauses=[], values=[]; if(search){clauses.push('(i.name LIKE ? OR i.category LIKE ?)'); values.push(`%${search}%`,`%${search}%`)} if(category){clauses.push('i.category LIKE ?');values.push(`${category}%`)} let having=''; if(minRating==='unrated') having='HAVING COUNT(r.id)=0'; else if(['1','2','3','4','5'].includes(String(minRating))) {having='HAVING COALESCE(AVG(r.score),0) >= ?';values.push(Number(minRating));} const where=clauses.length ? 'WHERE '+clauses.join(' AND ') : ''; const orderBy={rating:'average DESC, reviewCount DESC',reviews:'reviewCount DESC, average DESC',newest:'i.created_at DESC',name:'i.name ASC'}[sort] || 'i.name ASC'; return db.prepare(`SELECT i.id,i.name,i.category,i.created_at createdAt,COUNT(r.id) reviewCount,ROUND(AVG(r.score),1) average FROM items i LEFT JOIN reviews r ON r.item_id=i.id ${where} GROUP BY i.id ${having} ORDER BY ${orderBy}`).all(...values); }
function listCategories() { const rows = db.prepare('SELECT DISTINCT category FROM items').all(); const types = new Set(rows.map(r => r.category.split('·')[0].trim())); return [...types].sort(); }

const server=http.createServer(async(req,res)=>{ try { const url=new URL(req.url,`http://${req.headers.host}`); if(req.method==='GET' && url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(fs.readFileSync(path.join(__dirname,'index.html'),'utf8'))}
  if(req.method==='POST' && url.pathname==='/api/server/stop'){json(res,200,{message:'Ratedly is stopping.'});setTimeout(()=>server.close(()=>process.exit(0)),100);return}
  if(req.method==='POST' && url.pathname==='/api/auth/register'){const {name='',email='',password=''}=await readBody(req);if(!name.trim()||!email.includes('@')||password.length<6)return json(res,400,{error:'Name, valid email, and a 6+ character password are required.'});let result;try{result=db.prepare('INSERT INTO users(name,email,password_hash) VALUES (?,?,?)').run(name.trim(),email.trim().toLowerCase(),passwordHash(password));}catch{return json(res,409,{error:'An account with that email already exists.'})}const token=crypto.randomUUID();db.prepare('INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)').run(token,result.lastInsertRowid,Date.now()+7*864e5);return json(res,201,{token,user:{id:Number(result.lastInsertRowid),name:name.trim(),email:email.trim().toLowerCase()}})}
  if(req.method==='POST' && url.pathname==='/api/auth/login'){const {email='',password=''}=await readBody(req), user=db.prepare('SELECT * FROM users WHERE email=?').get(email.trim().toLowerCase());if(!user||!verifyPassword(password,user.password_hash))return json(res,401,{error:'Email or password is incorrect.'});const token=crypto.randomUUID();db.prepare('INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,?)').run(token,user.id,Date.now()+7*864e5);return json(res,200,{token,user:{id:user.id,name:user.name,email:user.email}})}
  if(req.method==='POST' && url.pathname==='/api/auth/logout'){const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(token)db.prepare('DELETE FROM sessions WHERE token=?').run(token);return json(res,204,{})}
  if(req.method==='GET' && url.pathname==='/api/items')return json(res,200,listItems(url.searchParams.get('q')||'',url.searchParams.get('minRating')||'',url.searchParams.get('category')||'',url.searchParams.get('sort')||''));
  if(req.method==='GET' && url.pathname==='/api/categories')return json(res,200,listCategories());
  if(req.method==='POST' && url.pathname==='/api/items'){if(!requireUser(req,res))return;const {name='',category=''}=await readBody(req);if(!name.trim()||!category.trim())return json(res,400,{error:'Item name and category are required.'});try{const r=db.prepare('INSERT INTO items(name,category) VALUES(?,?)').run(name.trim(),category.trim());return json(res,201,{id:Number(r.lastInsertRowid),name:name.trim(),category:category.trim()})}catch{return json(res,409,{error:'That item already exists.'})}}
  const match=url.pathname.match(/^\/api\/items\/(\d+)(?:\/reviews)?$/); if(match){const id=Number(match[1]);if(req.method==='GET'&&url.pathname.endsWith('/reviews')){const item=db.prepare('SELECT * FROM items WHERE id=?').get(id);if(!item)return json(res,404,{error:'Item not found.'});const reviews=db.prepare('SELECT r.id,r.score,r.text,r.user_id userId,r.created_at createdAt,r.updated_at updatedAt,u.name userName,u.age userAge FROM reviews r JOIN users u ON u.id=r.user_id WHERE r.item_id=? ORDER BY r.updated_at DESC').all(id);return json(res,200,{item,reviews})} if(req.method==='POST'&&url.pathname.endsWith('/reviews')){const user=requireUser(req,res);if(!user)return;const {score,text=''}=await readBody(req);if(!Number.isInteger(score)||score<1||score>5||!text.trim())return json(res,400,{error:'A rating from 1–5 and a review are required.'});try{db.prepare('INSERT INTO reviews(item_id,user_id,score,text) VALUES(?,?,?,?)').run(id,user.id,score,text.trim());return json(res,201,{message:'Review saved.'})}catch{return json(res,409,{error:'You already reviewed this item. Edit your existing review instead.'})}} if(req.method==='PUT'&&url.pathname.endsWith('/reviews')){const user=requireUser(req,res);if(!user)return;const {score,text=''}=await readBody(req);const r=db.prepare("UPDATE reviews SET score=?,text=?,updated_at=CURRENT_TIMESTAMP WHERE item_id=? AND user_id=?").run(score,text.trim(),id,user.id);return r.changes?json(res,200,{message:'Review updated.'}):json(res,404,{error:'Your review was not found.'})} if(req.method==='DELETE'&&url.pathname.endsWith('/reviews')){const user=requireUser(req,res);if(!user)return;db.prepare('DELETE FROM reviews WHERE item_id=? AND user_id=?').run(id,user.id);return json(res,204,{})}}
  json(res,404,{error:'Not found.'});
}catch(err){console.error(err);json(res,400,{error:err.message||'Bad request'})}});
server.listen(PORT,()=>console.log(`Ratedly is running at http://localhost:${PORT}`));
