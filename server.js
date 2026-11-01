const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const html=fs.readFileSync(path.join(__dirname,'public/index.html'));
const srv=http.createServer((q,s)=>{s.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});s.end(html)});
const wss=new WebSocketServer({server:srv});
const COLS=['#ff4d6d','#4dabf7','#51cf66','#fcc419','#cc5de8','#ff922b'];
let players=new Map(),R=300,state='wait',msg='Esperando jugadores...',timer=0,id=0;
function reset(){R=300;const ps=[...players.values()];ps.forEach((p,i)=>{const a=i/ps.length*Math.PI*2;
 Object.assign(p,{x:Math.cos(a)*180,y:Math.sin(a)*180,vx:0,vy:0,alive:true})});state='play'}
wss.on('connection',ws=>{
 if(players.size>=6){ws.send(JSON.stringify({full:1}));return ws.close()}
 const used=[...players.values()].map(p=>p.col);
 const p={id:++id,col:COLS.find(c=>!used.includes(c)),name:'Jugador',score:0,in:{x:0,y:0},alive:false,x:0,y:0,vx:0,vy:0};
 players.set(ws,p);ws.send(JSON.stringify({you:p.id}));
 ws.on('message',m=>{try{const d=JSON.parse(m);if(d.in){p.in.x=Math.max(-1,Math.min(1,+d.in.x||0));p.in.y=Math.max(-1,Math.min(1,+d.in.y||0))}
  if(d.name)p.name=String(d.name).slice(0,12)}catch(e){}});
 ws.on('close',()=>players.delete(ws));
});
setInterval(()=>{
 const ps=[...players.values()];
 if(state=='play'||state=='over'){
  const play=state=='play';if(play)R=Math.max(70,R-.08);
  for(const p of ps){if(!p.alive)continue;p.vx=(p.vx+p.in.x*.6)*.92;p.vy=(p.vy+p.in.y*.6)*.92;p.x+=p.vx;p.y+=p.vy;
   const d=Math.hypot(p.x,p.y);if(play){if(d>R+11)p.alive=false}else if(d>R-22){p.x*=(R-22)/d;p.y*=(R-22)/d}}
  for(let a=0;a<ps.length;a++)for(let b=a+1;b<ps.length;b++){const p=ps[a],q=ps[b];if(!p.alive||!q.alive)continue;
   const dx=q.x-p.x,dy=q.y-p.y,dd=Math.hypot(dx,dy)||1;if(dd<44){const nx=dx/dd,ny=dy/dd,rv=(p.vx-q.vx)*nx+(p.vy-q.vy)*ny;
    if(rv>0){const j=rv*1.6;p.vx-=j*nx;p.vy-=j*ny;q.vx+=j*nx;q.vy+=j*ny}const o=(44-dd)/2;p.x-=nx*o;p.y-=ny*o;q.x+=nx*o;q.y+=ny*o}}
  const al=ps.filter(p=>p.alive);
  if(!play){if(--timer<=0)ps.length>=2?reset():state='wait'}
  else if(ps.length<2){state='wait';msg='Esperando jugadores...'}
  else if(al.length<=1){if(al[0]){al[0].score++;msg='¡GANÓ '+al[0].name+'! 🏆'}else msg='¡Empate! 😂';state='over';timer=180}
 }
 else if(ps.length>=2){msg='¡Arranca!';state='over';timer=90}
 const out=JSON.stringify({R,state,msg,ps:ps.map(p=>({id:p.id,x:p.x|0,y:p.y|0,col:p.col,name:p.name,score:p.score,alive:p.alive}))});
 for(const ws of players.keys())ws.send(out);
},1000/60);
srv.listen(process.env.PORT||3000,()=>console.log('listo'));
