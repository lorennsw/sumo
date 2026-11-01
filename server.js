const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const html=fs.readFileSync(path.join(__dirname,'public/index.html'));
const srv=http.createServer((q,s)=>{s.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});s.end(html)});
const wss=new WebSocketServer({server:srv});
const COLS=['#ff4d6d','#4dabf7','#51cf66','#fcc419','#cc5de8','#ff922b'];
let players=new Map(),R=300,state='wait',msg='Esperando jugadores...',timer=0,id=0,round=0;
function reset(){R=300;round++;const ps=[...players.values()];ps.forEach((p,i)=>{const a=i/ps.length*Math.PI*2;
 Object.assign(p,{x:Math.cos(a)*180,y:Math.sin(a)*180,vx:0,vy:0,alive:true})});state='play'}
wss.on('connection',ws=>{
 if(players.size>=6){ws.send(JSON.stringify({full:1}));return ws.close()}
 const used=[...players.values()].map(p=>p.col);
 const p={id:++id,col:COLS.find(c=>!used.includes(c)),name:'Jugador',score:0,alive:false,x:0,y:0,vx:0,vy:0};
 players.set(ws,p);ws.send(JSON.stringify({you:p.id}));
 ws.on('message',m=>{try{const d=JSON.parse(m);if(d.pos&&d.r==round&&p.alive&&state!='wait'){const v=d.pos.map(Number);if(v.length==4&&v.every(isFinite)){p.x=v[0];p.y=v[1];p.vx=v[2];p.vy=v[3]}}
  if(d.dead&&d.r==round&&state=='play')p.alive=false;
  if(d.name)p.name=String(d.name).slice(0,12)}catch(e){}});
 ws.on('close',()=>players.delete(ws));
});
let tick=0;setInterval(()=>{
 const ps=[...players.values()];
 if(state=='play'||state=='over'){
  const play=state=='play';if(play)R=Math.max(70,R-.08);
  const al=ps.filter(p=>p.alive);
  if(!play){if(--timer<=0)ps.length>=2?reset():state='wait'}
  else if(ps.length<2){state='wait';msg='Esperando jugadores...'}
  else if(al.length<=1){if(al[0]){al[0].score++;msg='¡GANÓ '+al[0].name+'! 🏆'}else msg='¡Empate! 😂';state='over';timer=180}
 }
 else if(ps.length>=2){msg='¡Arranca!';state='over';timer=90}
 if(++tick%2)return;const out=JSON.stringify({R,round,state,msg,ps:ps.map(p=>({id:p.id,x:+p.x.toFixed(1),y:+p.y.toFixed(1),vx:+p.vx.toFixed(2),vy:+p.vy.toFixed(2),col:p.col,name:p.name,score:p.score,alive:p.alive}))});
 for(const ws of players.keys())ws.send(out);
},1000/60);
srv.listen(process.env.PORT||3000,()=>console.log('listo'));
